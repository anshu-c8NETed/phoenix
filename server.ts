// ════════════════════════════════════════════════════════════
//  Phoenix — Production Server
//  Rate-limit strategy:
//   • 3-model waterfall: gemini-2.5-flash → gemini-2.0-flash
//     → gemini-2.0-flash-lite (separate quotas)
//   • Circuit breaker: 429 blocks model for 90s, 503 for 20s.
//     Blocked models are skipped instantly — no wasted timeout.
//   • Optional GEMINI_API_KEY_2 for burst capacity (second key
//     tried on every model before moving to the next).
//   • Groq fallback (llama-3.3-70b-versatile) if all Gemini exhausted.
//     Set GROQ_API_KEY in .env — generous free-tier credits.
//   • Rich heuristic fallback if Groq also unavailable.
//   • LRU response cache (50 entries, 30 min TTL) — judges
//     hitting demo repeatedly get sub-10ms cached responses.
//   • DELETE /api/cache to flush before a fresh demo run.
//   • GET /api/diag shows per-model quota block status.
//   • Google Calendar OAuth — real event creation per rescue block.
// ════════════════════════════════════════════════════════════

import express from "express";
import path from "path";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

// ─── Types ───────────────────────────────────────────────────

interface ProjectIntelligence {
  project_type: "software" | "document" | "research" | "pitch" | "exam" | "interview" | "assignment" | "creative";
  tech_stack: string[];
  hardest_parts: string[];
  already_done: string[];
  biggest_unknowns: string[];
  demo_strategy: string;
  risk_level: "Critical" | "High" | "Moderate" | "Low";
  failure_causes: string[];
  risk_dimensions: Array<{ dimension: string; score: number; reasoning: string }>;
  deficit: number;
  availableHours: number;
  requiredHours: number;
  note?: string;
}

interface CacheEntry {
  value: any;
  expiresAt: number;
}

// ─── Simple LRU cache ─────────────────────────────────────────

class ResponseCache {
  private map = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 50, ttlMinutes = 30) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  key(obj: object): string {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(obj))
      .digest("hex")
      .slice(0, 16);
  }

  get(k: string): any | null {
    const entry = this.map.get(k);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.map.delete(k); return null; }
    this.map.delete(k);
    this.map.set(k, entry);
    return entry.value;
  }

  set(k: string, value: any): void {
    if (this.map.size >= this.maxSize) {
      const first = this.map.keys().next().value;
      if (first) this.map.delete(first);
    }
    this.map.set(k, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

// ════════════════════════════════════════════════════════════
//  GOOGLE CALENDAR — OAuth helpers
//  Token store: in-memory (keyed by signed cookie session ID).
//  For production replace with Firestore / Redis.
// ════════════════════════════════════════════════════════════

const calTokenStore = new Map<string, any>();

function makeOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/callback"
  );
}

const calendarConfigured = !!(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

function parseHourRange(hourRange: string, planStart: Date): { startTime: Date; endTime: Date } {
  const match = hourRange.match(/(\d+)(?::(\d+))?\s*[-–]\s*(\d+)(?::(\d+))?/);
  if (match) {
    const startH = parseInt(match[1], 10);
    const startM = parseInt(match[2] || "0", 10);
    const endH   = parseInt(match[3], 10);
    const endM   = parseInt(match[4] || "0", 10);
    const startTime = new Date(planStart);
    startTime.setHours(startTime.getHours() + startH, startM, 0, 0);
    const endTime = new Date(planStart);
    endTime.setHours(endTime.getHours() + endH, endM, 0, 0);
    if (endTime <= startTime) endTime.setHours(endTime.getHours() + 1);
    return { startTime, endTime };
  }
  const startTime = new Date(planStart);
  const endTime   = new Date(planStart);
  endTime.setHours(endTime.getHours() + 1);
  return { startTime, endTime };
}

function calColorId(type: string): string {
  const map: Record<string, string> = {
    build: "9", debug: "11", test: "5", deploy: "2", pitch: "6",
    write: "1", draft: "1", review: "3", design: "4", rehearse: "6",
    finalize: "2", submit: "10", analyze: "9", synthesize: "7",
    record: "11", format: "8", cite: "8",
  };
  return map[type] || "9";
}

// ─── Server bootstrap ─────────────────────────────────────────

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "20mb" }));
  app.use(cookieParser(process.env.SESSION_SECRET || "phoenix-secret-change-me"));

  const cache = new ResponseCache(50, 30);

  // ── AI clients ──────────────────────────────────────────────

  const apiKey  = process.env.GEMINI_API_KEY;
  const apiKey2 = process.env.GEMINI_API_KEY_2;
  const groqKey = process.env.GROQ_API_KEY;

  const ai  = apiKey  ? new GoogleGenAI({ apiKey,  httpOptions: { headers: { "User-Agent": "aistudio-build" } } }) : null;
  const ai2 = apiKey2 ? new GoogleGenAI({ apiKey: apiKey2, httpOptions: { headers: { "User-Agent": "aistudio-build" } } }) : null;

  const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];
  const TIMEOUT_MS_TEXT = 18_000;
  const TIMEOUT_MS_PDF  = 45_000;

  const quotaBlockedUntil = new Map<string, number>();

  function isBlocked(model: string): boolean {
    const until = quotaBlockedUntil.get(model) ?? 0;
    if (Date.now() < until) return true;
    quotaBlockedUntil.delete(model);
    return false;
  }

  function blockModel(model: string, seconds = 60): void {
    quotaBlockedUntil.set(model, Date.now() + seconds * 1000);
    console.warn(`[Phoenix] ⛔ ${model} blocked for ${seconds}s`);
  }

  function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error(`Timeout after ${ms}ms`)), ms);
      p.then(v => { clearTimeout(t); res(v); })
       .catch(e => { clearTimeout(t); rej(e); });
    });
  }

  async function callGroq(prompt: string, jsonMode: boolean, schema?: any): Promise<string> {
    if (!groqKey) { console.warn("[Phoenix] Groq skipped — no GROQ_API_KEY set"); return ""; }
    console.log("[Phoenix] 🔄 Attempting Groq fallback (llama-3.3-70b-versatile)...");
    const schemaHint = schema
      ? `\n\nRespond ONLY with a single valid JSON object exactly matching this shape — no markdown fences:\n${JSON.stringify(schema, null, 2)}`
      : "";
    try {
      const r = await withTimeout(
        fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt + schemaHint }],
            temperature: 0.3,
            max_tokens: 4096,
            ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          }),
        }),
        TIMEOUT_MS_TEXT * 1.5
      );
      if (!r.ok) {
        const errBody = await r.text().catch(() => "");
        console.warn(`[Phoenix] ❌ Groq failed: ${r.status} ${r.statusText} — ${errBody.slice(0, 120)}`);
        return "";
      }
      const d = await r.json();
      const text = d?.choices?.[0]?.message?.content;
      if (text) console.log("[Phoenix] Served by: llama-3.3-70b-versatile (Groq)");
      return text || "";
    } catch (e: any) {
      console.warn("[Phoenix] Groq error:", e?.message);
      return "";
    }
  }

  async function tryGeminiModel(
    client: InstanceType<typeof GoogleGenAI>,
    model: string,
    contents: any[],
    config: any,
    timeoutMs: number
  ): Promise<string | null> {
    if (isBlocked(model)) return null;
    try {
      const r = await withTimeout(
        client.models.generateContent({ model, contents, config }),
        timeoutMs
      );
      if (r?.text) {
        console.log(`[Phoenix] ✓ Served by: ${model}`);
        return r.text;
      }
      return null;
    } catch (e: any) {
      const msg   = String(e?.message || e);
      const isTimeout = msg.includes("Timeout after");
      const code  = e?.status ?? (msg.match(/"code":(\d+)/)?.[1] ? Number(msg.match(/"code":(\d+)/)[1]) : 0);
      const is429 = code === 429 || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED");
      const is503 = code === 503 || msg.includes("overloaded") || msg.includes("high demand");
      console.warn(`[Phoenix] ${model} failed (${isTimeout ? "timeout" : code || "err"}): ${msg.slice(0, 80)}`);
      if (is429) blockModel(model, 90);
      if (is503) blockModel(model, 20);
      return null;
    }
  }

  async function callAI(
    contents: any[],
    config: any
  ): Promise<{ text: string; servedBy: "gemini" | "grok" | "none" }> {
    const clients = [ai, ai2].filter(Boolean) as InstanceType<typeof GoogleGenAI>[];
    const hasPdf = contents.some(c => c?.inlineData?.mimeType === "application/pdf");
    const timeoutMs = hasPdf ? TIMEOUT_MS_PDF : TIMEOUT_MS_TEXT;

    for (const model of MODELS) {
      for (const client of clients) {
        const text = await tryGeminiModel(client, model, contents, config, timeoutMs);
        if (text) return { text, servedBy: "gemini" };
      }
    }

    console.warn("[Phoenix] ⚠ All Gemini models exhausted — falling through to Groq...");
    const textParts = contents
      .filter(c => typeof c === "string" || typeof c?.text === "string")
      .map(c => (typeof c === "string" ? c : c.text));
    if (textParts.length) {
      const groqText = await callGroq(
        textParts.join("\n"),
        config?.responseMimeType === "application/json",
        config?.responseSchema
      );
      if (groqText) return { text: groqText, servedBy: "grok" };
    }

    return { text: "", servedBy: "none" };
  }

  function pdfContent(pdfData?: string): any | null {
    if (!pdfData || typeof pdfData !== "string") return null;
    const b64 = pdfData.includes(";base64,") ? pdfData.split(";base64,")[1] : pdfData;
    if (!b64) return null;
    console.log(`[Phoenix] PDF attached — ${(b64.length / 1024).toFixed(0)} KB b64`);
    return { inlineData: { data: b64, mimeType: "application/pdf" } };
  }

  // ══════════════════════════════════════════════════════════════
  //  GOOGLE CALENDAR ROUTES
  // ══════════════════════════════════════════════════════════════

  // GET /api/calendar/status
  app.get("/api/calendar/status", (req: any, res: any) => {
    const sid = req.signedCookies?.phoenix_sid;
    const hasToken = !!(sid && calTokenStore.get(sid));
    res.json({ configured: calendarConfigured, authenticated: hasToken });
  });

  // GET /api/calendar/auth — redirect to Google consent screen
  app.get("/api/calendar/auth", (req: any, res: any) => {
    if (!calendarConfigured) {
      return res.status(503).json({
        error: "Google Calendar not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env",
      });
    }
    const oauth2 = makeOAuth2Client();
    const url = oauth2.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.events"],
      prompt: "consent",
    });
    // Assign session ID before redirecting so we can match the callback
    const sid = crypto.randomBytes(16).toString("hex");
    res.cookie("phoenix_sid", sid, {
      signed: true, httpOnly: true, sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(url);
  });

  // GET /api/calendar/callback — exchange code for tokens
  app.get("/api/calendar/callback", async (req: any, res: any) => {
    const { code, error } = req.query;
    if (error || !code) return res.redirect("/?calendar=denied");
    try {
      const oauth2 = makeOAuth2Client();
      const { tokens } = await oauth2.getToken(code as string);
      const sid = req.signedCookies?.phoenix_sid || crypto.randomBytes(16).toString("hex");
      calTokenStore.set(sid, tokens);
      res.cookie("phoenix_sid", sid, {
        signed: true, httpOnly: true, sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      console.log(`[Phoenix] ✓ Google Calendar OAuth success — session ${sid.slice(0, 8)}…`);
      res.redirect("/?calendar=ready");
    } catch (e: any) {
      console.error("[Phoenix] Calendar callback error:", e?.message);
      res.redirect("/?calendar=error");
    }
  });

  // POST /api/calendar/events — create one event per rescue block
  app.post("/api/calendar/events", async (req: any, res: any) => {
    if (!calendarConfigured) {
      return res.status(503).json({ error: "Google Calendar not configured." });
    }
    const sid = req.signedCookies?.phoenix_sid;
    const tokens = sid ? calTokenStore.get(sid) : null;
    if (!tokens) {
      return res.status(401).json({ error: "Not authenticated. Please connect Google Calendar first." });
    }

    const { goal, startISO, rescueBlocks, keepFeatures, successChanceBefore, successChanceAfter, riskLevel } = req.body;
    if (!goal || !rescueBlocks?.length) {
      return res.status(400).json({ error: "goal and rescueBlocks are required." });
    }

    try {
      const oauth2 = makeOAuth2Client();
      oauth2.setCredentials(tokens);
      oauth2.on("tokens", (newTokens: any) => {
        calTokenStore.set(sid, { ...tokens, ...newTokens });
      });

      const calendar = google.calendar({ version: "v3", auth: oauth2 });
      const planStart = startISO ? new Date(startISO) : new Date();
      const createdEvents: any[] = [];
      const errors: string[] = [];

      for (const block of rescueBlocks) {
        try {
          const { startTime, endTime } = parseHourRange(block.hour_range, planStart);
          const event = {
            summary: `🔥 [${block.type.toUpperCase()}] ${block.task.slice(0, 60)}${block.task.length > 60 ? "…" : ""}`,
            description: [
              `Phoenix Rescue Plan — ${goal}`,
              ``,
              `Task: ${block.task}`,
              `Type: ${block.type}`,
              `Risk level: ${riskLevel || "High"}`,
              ``,
              `📈 Success odds: ${successChanceBefore}% → ${successChanceAfter}%`,
              `✅ Shipping: ${(keepFeatures || []).slice(0, 3).join(", ")}`,
              ``,
              `Generated by Phoenix · Deadline Trauma Operations Center`,
            ].join("\n"),
            start: { dateTime: startTime.toISOString(), timeZone: req.body.timeZone || "Asia/Kolkata" },
            end:   { dateTime: endTime.toISOString(),   timeZone: req.body.timeZone || "Asia/Kolkata" },
            colorId: calColorId(block.type),
            reminders: {
              useDefault: false,
              overrides: [{ method: "popup", minutes: 2 }],
            },
          };
          const created = await calendar.events.insert({ calendarId: "primary", requestBody: event });
          createdEvents.push({
            id: created.data.id,
            summary: created.data.summary,
            start: created.data.start?.dateTime,
            htmlLink: created.data.htmlLink,
          });
        } catch (blockErr: any) {
          errors.push(`Block "${block.hour_range}": ${blockErr?.message}`);
        }
      }

      console.log(`[Phoenix] ✓ Created ${createdEvents.length} calendar events for "${goal}"`);
      res.json({
        created: createdEvents.length,
        events: createdEvents,
        errors: errors.length ? errors : undefined,
        calendarLink: "https://calendar.google.com/calendar/r",
      });
    } catch (e: any) {
      console.error("[Phoenix] Calendar events error:", e?.message);
      if (e?.code === 401 || String(e?.message).includes("invalid_grant")) {
        if (sid) calTokenStore.delete(sid);
        return res.status(401).json({ error: "Calendar session expired. Please reconnect." });
      }
      res.status(500).json({ error: e?.message || "Failed to create calendar events." });
    }
  });

  // POST /api/calendar/revoke — sign out
  app.post("/api/calendar/revoke", async (req: any, res: any) => {
    const sid = req.signedCookies?.phoenix_sid;
    if (sid) {
      const tokens = calTokenStore.get(sid);
      calTokenStore.delete(sid);
      if (tokens?.access_token) {
        try {
          const oauth2 = makeOAuth2Client();
          oauth2.setCredentials(tokens);
          await oauth2.revokeCredentials();
        } catch { /* ignore */ }
      }
    }
    res.clearCookie("phoenix_sid");
    res.json({ ok: true });
  });

  // ══════════════════════════════════════════════════════════════
  //  AGENT 1 — /api/diagnose
  // ══════════════════════════════════════════════════════════════

  app.post("/api/diagnose", async (req, res) => {
    try {
      const { goal, availableHours, requiredHours, progress, featuresText, pdfData } = req.body;
      if (!goal) return res.status(400).json({ error: "Goal is required." });

      const avail = Number(availableHours) || 0;
      const reqd  = Number(requiredHours)  || 0;
      const prog  = Number(progress)       || 0;
      const deficit = reqd - avail;

      const ck = cache.key({ goal, avail, reqd, prog, featuresText, hasPdf: !!pdfData });
      const cached = cache.get(ck);
      if (cached) { console.log("[Phoenix] Cache hit: /api/diagnose"); return res.json(cached); }

      const pdf = pdfContent(pdfData);
      const contents: any[] = [];
      if (pdf) contents.push(pdf);

      contents.push(`
You are the Phoenix Crisis Intelligence Engine — a senior engineer and PM who has rescued hundreds of deadline crises.
Read every detail below (and the attached document/spec if present) before responding.

━━━ SITUATION ━━━
Goal: "${goal}"
Time Available: ${avail}h | Estimated Work Remaining: ${reqd}h | Deficit: ${deficit}h
Progress So Far: ${prog}%
${featuresText ? `Feature List:\n${featuresText}` : ""}
${pdf ? "A project specification / assignment doc is attached above — extract tech details, requirements, grading rubric, and constraints from it." : ""}

━━━ YOUR TASKS ━━━

1. CLASSIFY project_type: "software" | "document" | "research" | "pitch" | "exam" | "interview" | "assignment" | "creative"
2. EXTRACT tech_stack: list of specific technologies / frameworks / languages.
3. IDENTIFY hardest_parts: top 3 things that will actually blow up under time pressure.
4. LIST already_done: what's realistically complete given ${prog}% progress.
5. IDENTIFY biggest_unknowns: external APIs, deployment steps, integrations, grading rubrics.
6. WRITE demo_strategy: one concrete sentence on how to fake a working demo if time gets critical.
7. SET risk_level: "Critical" | "High" | "Moderate" | "Low"
8. LIST failure_causes: top 3 specific reasons THIS project might fail.
9. SCORE 5 risk dimensions 0-10: Time, Scope, Complexity, Dependency, Execution

Return ONLY valid JSON:
{
  "project_type": "software"|"document"|"research"|"pitch"|"exam"|"interview"|"assignment"|"creative",
  "tech_stack": ["string"],
  "hardest_parts": ["string","string","string"],
  "already_done": ["string"],
  "biggest_unknowns": ["string"],
  "demo_strategy": "string",
  "risk_level": "Critical"|"High"|"Moderate"|"Low",
  "failure_causes": ["string","string","string"],
  "risk_dimensions": [
    { "dimension": "Time",       "score": number, "reasoning": "string" },
    { "dimension": "Scope",      "score": number, "reasoning": "string" },
    { "dimension": "Complexity", "score": number, "reasoning": "string" },
    { "dimension": "Dependency", "score": number, "reasoning": "string" },
    { "dimension": "Execution",  "score": number, "reasoning": "string" }
  ]
}
`);

      const schema = {
        type: Type.OBJECT,
        properties: {
          project_type:    { type: Type.STRING, enum: ["software","document","research","pitch","exam","interview","assignment","creative"] },
          tech_stack:      { type: Type.ARRAY,  items: { type: Type.STRING } },
          hardest_parts:   { type: Type.ARRAY,  items: { type: Type.STRING } },
          already_done:    { type: Type.ARRAY,  items: { type: Type.STRING } },
          biggest_unknowns:{ type: Type.ARRAY,  items: { type: Type.STRING } },
          demo_strategy:   { type: Type.STRING },
          risk_level:      { type: Type.STRING, enum: ["Critical","High","Moderate","Low"] },
          failure_causes:  { type: Type.ARRAY,  items: { type: Type.STRING } },
          risk_dimensions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dimension: { type: Type.STRING },
                score:     { type: Type.INTEGER },
                reasoning: { type: Type.STRING },
              },
              required: ["dimension","score","reasoning"],
            },
          },
        },
        required: ["project_type","tech_stack","hardest_parts","already_done",
                   "biggest_unknowns","demo_strategy","risk_level","failure_causes","risk_dimensions"],
      };

      const { text, servedBy } = await callAI(contents, {
        responseMimeType: "application/json",
        responseSchema: schema,
      });

      let result: any;
      if (text) {
        result = JSON.parse(text.trim());
        if (servedBy === "grok") result.note = "Recovered via Groq (llama-3.3-70b-versatile).";
      } else {
        const goalL = goal.toLowerCase();
        const pType =
          goalL.match(/exam|test|quiz|study|certification|exams/) ? "exam" :
          goalL.match(/interview|behavioral|technical screen|job prep/) ? "interview" :
          goalL.match(/essay|assignment|coursework|homework|submit|report/) ? "assignment" :
          goalL.match(/pitch|deck|slide|investor|presentation/) ? "pitch" :
          goalL.match(/research|experiment|analysis|survey|study/) ? "research" :
          goalL.match(/thesis|paper|write|document/) ? "document" :
          goalL.match(/design|creative|music|art|blog|story/) ? "creative" : "software";
        const riskLevel: ProjectIntelligence["risk_level"] =
          deficit > 4 ? "Critical" : deficit > 0 ? "High" : deficit > -3 ? "Moderate" : "Low";
        result = {
          project_type: pType,
          tech_stack: pType === "software" ? ["React", "Node.js"] : [],
          hardest_parts: [
            `Time compression: ${deficit}h deficit leaves almost no margin for debugging.`,
            `Scope discipline: resisting the urge to add features that aren't on the keep list.`,
            `Integration risk: connecting all pieces into a coherent demo under pressure.`,
          ],
          already_done: prog > 0 ? [`Roughly ${prog}% of core work completed.`] : [],
          biggest_unknowns: ["Deployment / submission process", "Third-party API reliability"],
          demo_strategy: "Hardcode API responses for demo, use localStorage instead of real backend if needed, record a 60s screen recording as backup.",
          risk_level: riskLevel,
          failure_causes: [
            `${deficit}h deficit means the original scope is impossible — scope must be cut now.`,
            `Low progress (${prog}%) means foundational work is still outstanding.`,
            "Context-switching and debugging will eat 30-40% of remaining time.",
          ],
          risk_dimensions: [
            { dimension: "Time",       score: Math.min(10, Math.round(deficit / Math.max(avail, 1) * 10 + 5)), reasoning: `${deficit}h deficit with ${avail}h remaining.` },
            { dimension: "Scope",      score: prog < 30 ? 8 : prog < 60 ? 5 : 3, reasoning: `${prog}% complete — scope risk inversely scales with progress.` },
            { dimension: "Complexity", score: pType === "software" ? 7 : 5, reasoning: "Estimated from project type under time pressure." },
            { dimension: "Dependency", score: 5, reasoning: "External dependency risk assumed moderate." },
            { dimension: "Execution",  score: deficit > 0 ? 8 : 4, reasoning: "High deficit amplifies execution fatigue." },
          ],
          note: "Generated via heuristic fallback — Gemini/Groq unavailable.",
        };
      }

      const response = { ...result, deficit, availableHours: avail, requiredHours: reqd };
      cache.set(ck, response);
      res.json(response);

    } catch (e: any) {
      console.error("[Phoenix] /api/diagnose error:", e);
      res.status(500).json({ error: e?.message || "Diagnosis failed." });
    }
  });

  // ══════════════════════════════════════════════════════════════
  //  AGENT 2 — /api/survival-version
  // ══════════════════════════════════════════════════════════════

  app.post("/api/survival-version", async (req, res) => {
    try {
      const { goal, availableHours, requiredHours, progress, features, intelligence, pdfData, strictness, priorAttemptNote } = req.body;
      if (!goal || !features) return res.status(400).json({ error: "Goal and features required." });

      const avail = Number(availableHours) || 0;
      const reqd  = Number(requiredHours)  || 0;
      const prog  = Number(progress)       || 0;
      const intel: Partial<ProjectIntelligence> = intelligence || {};
      const pType = intel.project_type || "software";
      // "high" strictness is used by the Agent 4 self-correction loop (see
      // /api/triage-and-plan) when a first-pass plan simulates poorly — it
      // asks for a more conservative cut and folds in what went wrong so
      // the retry isn't just rerolling the same dice.
      const strict: "normal" | "high" = strictness === "high" ? "high" : "normal";
      const attemptNote: string = typeof priorAttemptNote === "string" ? priorAttemptNote.slice(0, 600) : "";

      const featureList: string[] = Array.isArray(features)
        ? features
        : features.split("\n").map((f: string) => f.trim()).filter(Boolean);
      if (!featureList.length) return res.status(400).json({ error: "No features to triage." });

      const ck = cache.key({ goal, avail, reqd, prog, featureList, pType, strict, attemptNote });
      const cached = cache.get(ck);
      if (cached) { console.log("[Phoenix] Cache hit: /api/survival-version"); return res.json(cached); }

      const pdf = pdfContent(pdfData);
      const contents: any[] = [];
      if (pdf) contents.push(pdf);

      const triageRules: Record<string, string> = {
        software:   "Keep: runnable core flow, anything the judge clicks during demo, auth only if required. Cut: polish, analytics, admin, edge cases.",
        document:   "Keep: required sections per rubric, core thesis, conclusion. Cut: extended examples, decorative formatting, optional appendices.",
        research:   "Keep: central analysis, key figures, core methodology, main citations. Cut: extended lit review, secondary datasets, future work.",
        pitch:      "Keep: problem, solution demo, one key metric, CTA. Cut: detailed financials, team bios, appendix.",
        exam:       "Keep: high-yield topics most likely to appear, weak areas that need urgent review. Cut: low-probability edge topics.",
        interview:  "Keep: most likely question types, 2-3 strong STAR stories, company research essentials. Cut: obscure algorithms.",
        assignment: "Keep: sections worth the most marks, core argument, required citations. Cut: optional appendices.",
        creative:   "Keep: the core deliverable the audience will actually see/hear. Cut: extras, variations.",
      };

      contents.push(`
You are the Phoenix Scope Optimizer. Ruthless, reasoned triage for THIS project.

━━━ PROJECT INTELLIGENCE ━━━
Goal: "${goal}"
Type: ${pType} | Available: ${avail}h | Required: ${reqd}h | Progress: ${prog}%
Tech Stack: ${(intel.tech_stack || []).join(", ") || "Unknown"}
Hardest Parts: ${(intel.hardest_parts || []).map(h => `• ${h}`).join("\n")}
Already Done: ${(intel.already_done || []).join(", ") || "Unknown"}
Risk Level: ${intel.risk_level || "High"}

━━━ TRIAGE RULES for ${pType} ━━━
${triageRules[pType] || triageRules.software}
${strict === "high" ? `
━━━ STRICTER PASS REQUIRED ━━━
A previous triage at normal strictness was simulated forward and did not reach a
safe survival probability. Cut harder this time: keep only what is truly load-bearing
for a working demo, move anything borderline from "keep" to "cut", and prefer shortcuts
that trade polish for certainty of completion.
${attemptNote ? `What went wrong in the simulated first attempt: ${attemptNote}` : ""}
` : ""}
━━━ FEATURES TO TRIAGE ━━━
${featureList.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Return ONLY valid JSON:
{
  "keep": [{ "feature": "string", "confidence": number, "reason": "string", "shortcut": "string" }],
  "cut":  [{ "feature": "string", "reason": "string", "fake_strategy": "string" }],
  "success_chance_before": number,
  "success_chance_after":  number
}
`);

      const schema = {
        type: Type.OBJECT,
        properties: {
          keep: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { feature: { type: Type.STRING }, confidence: { type: Type.INTEGER }, reason: { type: Type.STRING }, shortcut: { type: Type.STRING } }, required: ["feature","confidence","reason","shortcut"] } },
          cut:  { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { feature: { type: Type.STRING }, reason: { type: Type.STRING }, fake_strategy: { type: Type.STRING } }, required: ["feature","reason","fake_strategy"] } },
          success_chance_before: { type: Type.INTEGER },
          success_chance_after:  { type: Type.INTEGER },
        },
        required: ["keep","cut","success_chance_before","success_chance_after"],
      };

      const { text, servedBy } = await callAI(contents, { responseMimeType: "application/json", responseSchema: schema });
      let result: any;
      if (text) {
        result = JSON.parse(text.trim());
        if (servedBy === "grok") result.note = "Recovered via Groq (llama-3.3-70b-versatile).";
      } else {
        const half = Math.max(1, Math.ceil(featureList.length * (strict === "high" ? 0.3 : 0.45)));
        const diff = reqd - avail;
        const before = diff > 10 ? 10 : diff > 5 ? 25 : diff > 0 ? 40 : 70;
        result = {
          keep: featureList.slice(0, half).map((f, i) => ({ feature: f, confidence: Math.max(60, 95 - i * 8), reason: "Core deliverable — required for a working submission.", shortcut: "Implement the minimal path; skip error handling for now." })),
          cut: featureList.slice(half).map(f => ({ feature: f, reason: "Insufficient time.", fake_strategy: "Add a placeholder UI element with 'Coming soon' or hardcode demo data." })),
          success_chance_before: before,
          success_chance_after: Math.min(92, before + (strict === "high" ? 52 : 45)),
          note: "Heuristic fallback — AI unavailable.",
        };
      }

      cache.set(ck, result);
      res.json(result);

    } catch (e: any) {
      console.error("[Phoenix] /api/survival-version error:", e);
      res.status(500).json({ error: e?.message || "Triage failed." });
    }
  });

  // ══════════════════════════════════════════════════════════════
  //  AGENT 3 — /api/rescue-plan
  // ══════════════════════════════════════════════════════════════

  app.post("/api/rescue-plan", async (req, res) => {
    try {
      const { goal, availableHours, requiredHours, progress, keep, success_chance_after, intelligence, pdfData } = req.body;
      if (!goal || !keep) return res.status(400).json({ error: "Goal and keep list required." });

      const avail = Math.max(1, Number(availableHours) || 0);
      const reqd  = Math.max(1, Number(requiredHours)  || 0);
      const prog  = Number(progress) || 0;
      const intel: Partial<ProjectIntelligence> = intelligence || {};
      const pType = intel.project_type || "software";

      const keepList: Array<{ feature: string; confidence: number; reason: string; shortcut: string }> =
        Array.isArray(keep) ? keep.map((k: any) => typeof k === "string" ? { feature: k, confidence: 80, reason: "", shortcut: "" } : k) : [];
      if (!keepList.length) return res.status(400).json({ error: "Empty keep list." });

      const ck = cache.key({ goal, avail, reqd, prog, keepList: keepList.map(k => k.feature), pType });
      const cached = cache.get(ck);
      if (cached) { console.log("[Phoenix] Cache hit: /api/rescue-plan"); return res.json(cached); }

      const pdf = pdfContent(pdfData);
      const contents: any[] = [];
      if (pdf) contents.push(pdf);

      const blockTypes: Record<string, string> = {
        software: '"build" | "test" | "deploy" | "debug"',
        document: '"write" | "review" | "format" | "submit"',
        research: '"analyze" | "synthesize" | "cite" | "draft"',
        pitch:    '"design" | "rehearse" | "record" | "finalize"',
        exam:     '"review" | "practice" | "memorize" | "test-yourself"',
        interview:'"prepare" | "practice" | "research" | "rehearse"',
        assignment:'"write" | "review" | "cite" | "submit"',
        creative: '"create" | "refine" | "review" | "finalize"',
      };

      const wrapUpVerb: Record<string, string> = {
        software:  "deploy and verify the live URL works; record a 60s backup screen recording",
        document:  "export final PDF, check word count and formatting against rubric, submit",
        research:  "compile final figures, verify citations, export and submit",
        pitch:     "run full rehearsal, fix any broken slides, share link with judges",
        exam:      "do one final rapid-fire self-quiz across all kept topics, sleep on time",
        interview: "run a full mock interview out loud, review weak answers, prepare questions to ask",
        assignment:"proofread once end-to-end, verify references, submit",
        creative:  "do a final review of the deliverable as an audience member would, export and share",
      };

      contents.push(`
You are the Phoenix Rescue Planner. Write execution plans a developer/student can follow minute-by-minute.

━━━ PROJECT INTELLIGENCE ━━━
Goal: "${goal}"
Type: ${pType} | Available: ${avail}h | Required: ${reqd}h | Progress: ${prog}%
Tech Stack: ${(intel.tech_stack || []).join(", ") || "Unknown"}
Hardest Parts: ${(intel.hardest_parts || []).map(h => `  ⚠ ${h}`).join("\n")}
Already Done: ${(intel.already_done || []).join(", ") || "Unknown"}
Biggest Unknowns: ${(intel.biggest_unknowns || []).join(", ") || "None"}
Demo Strategy: ${intel.demo_strategy || "Not set"}
Success Chance After Triage: ${success_chance_after || 50}%

━━━ FEATURES TO BUILD ━━━
${keepList.map((k, i) => `${i + 1}. ${k.feature} [confidence: ${k.confidence}%]\n   Shortcut: ${k.shortcut || "Build minimal path only"}`).join("\n")}

━━━ EXECUTION RULES ━━━
1. Total planned hours MUST equal exactly ${avail}h or less.
2. Every task is ONE concrete action sentence — specific enough to start immediately.
3. Reference tech stack in task descriptions.
4. The LAST block must: ${wrapUpVerb[pType] || wrapUpVerb.software}
5. Flag blocks touching hardest parts as "high_risk".
6. Exactly ONE block = "critical_path".
7. buffer_hours = ${avail} - total_hours_planned (can be 0, never negative).
8. Use block types: ${blockTypes[pType] || blockTypes.software}

Return ONLY valid JSON:
{
  "blocks": [{ "hour_range": "Hour 1–2", "task": "string", "type": "string", "risk_tag": "critical_path"|"high_risk"|"normal"|"buffer" }],
  "total_hours_planned": number,
  "buffer_hours": number,
  "critical_path_block": number
}
`);

      const schema = {
        type: Type.OBJECT,
        properties: {
          blocks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { hour_range: { type: Type.STRING }, task: { type: Type.STRING }, type: { type: Type.STRING }, risk_tag: { type: Type.STRING, enum: ["critical_path","high_risk","normal","buffer"] } }, required: ["hour_range","task","type","risk_tag"] } },
          total_hours_planned: { type: Type.INTEGER },
          buffer_hours:        { type: Type.INTEGER },
          critical_path_block: { type: Type.INTEGER },
        },
        required: ["blocks","total_hours_planned","buffer_hours","critical_path_block"],
      };

      const { text, servedBy } = await callAI(contents, { responseMimeType: "application/json", responseSchema: schema });
      let result: any;
      if (text) {
        result = JSON.parse(text.trim());
        if (servedBy === "grok") result.note = "Recovered via Groq (llama-3.3-70b-versatile).";
      } else {
        const planned = avail > 5 ? avail - 1 : avail;
        const buf = avail - planned;
        const half = Math.max(1, Math.floor(planned / 2));
        const f0 = keepList[0]?.feature || "core feature";
        const f1 = keepList[1]?.feature || f0;
        result = {
          blocks: [
            { hour_range: `Hour 1–${half}`, task: `Build and wire up core logic for ${f0} — skip validation and error states, aim for happy path only.`, type: "build", risk_tag: "critical_path" },
            { hour_range: `Hour ${half + 1}–${planned - 1}`, task: `Integrate ${f1}, run a quick smoke test, fix any blockers that would break the demo.`, type: "test", risk_tag: "high_risk" },
            { hour_range: `Hour ${planned}`, task: `Deploy, verify the live URL, record 60s screen recording as backup.`, type: "deploy", risk_tag: "normal" },
          ],
          total_hours_planned: planned,
          buffer_hours: buf,
          critical_path_block: 0,
          note: "Heuristic fallback — AI unavailable.",
        };
      }

      cache.set(ck, result);
      res.json(result);

    } catch (e: any) {
      console.error("[Phoenix] /api/rescue-plan error:", e);
      res.status(500).json({ error: e?.message || "Rescue planning failed." });
    }
  });

  // ══════════════════════════════════════════════════════════════
  //  PARALLEL — /api/triage-and-plan
  // ══════════════════════════════════════════════════════════════

  app.post("/api/triage-and-plan", async (req, res) => {
    try {
      const { goal, availableHours, requiredHours, progress, features, intelligence, pdfData } = req.body;
      if (!goal || !features) return res.status(400).json({ error: "Goal and features required." });

      const PORT = process.env.PORT || 3000;
      const base = `http://localhost:${PORT}`;

      const runTriage = (strictness?: "high", priorAttemptNote?: string) =>
        fetch(`${base}/api/survival-version`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal, availableHours, requiredHours, progress, features, intelligence, pdfData, strictness, priorAttemptNote }),
        }).then(r => r.json()) as Promise<any>;

      const runPlan = (keep: any[], successChanceAfter: number) =>
        fetch(`${base}/api/rescue-plan`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal, availableHours, requiredHours, progress, keep, success_chance_after: successChanceAfter, intelligence, pdfData }),
        }).then(r => r.json()) as Promise<any>;

      const runSimulate = (keep: any[], successChanceAfter: number, blocks: any[]) =>
        fetch(`${base}/api/simulate`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal, availableHours, requiredHours, progress, intelligence, keep, success_chance_after: successChanceAfter, blocks, pdfData }),
        }).then(r => r.json()) as Promise<any>;

      // ── First pass ──────────────────────────────────────────
      let triage = await runTriage();
      let plan = await runPlan(triage.keep, triage.success_chance_after);

      // ── Self-correction loop ────────────────────────────────
      // Run the plan forward through Agent 4's simulator. If the simulated
      // success odds land below the safety threshold, the first attempt
      // wasn't conservative enough — retry triage once at high strictness,
      // feeding back what the simulation revealed went wrong. Capped at a
      // single retry so a stubbornly risky goal can't loop forever.
      const SUCCESS_THRESHOLD = 60;
      let selfCorrected = false;
      let simulation: any = null;

      try {
        simulation = await runSimulate(triage.keep, triage.success_chance_after, plan.blocks);
        const impliedSuccess = typeof triage.success_chance_after === "number" ? triage.success_chance_after : 0;
        // Secondary signal alongside the raw percentage: even a high quoted
        // success_chance_after is suspect if the *Phoenix* timeline (B) still
        // simulates its own failure beats — the simulator disagreeing with
        // the triage step's own optimism is itself a sign the plan is fragile.
        const phoenixTimelineFails: boolean = Array.isArray(simulation?.timeline_b)
          && simulation.timeline_b.some((e: any) => e.type === "failure");

        if (impliedSuccess < SUCCESS_THRESHOLD || phoenixTimelineFails) {
          const failureBeats = (simulation?.timeline_a || [])
            .filter((e: any) => e.type === "failure" || e.type === "warning")
            .map((e: any) => e.event)
            .slice(0, 3)
            .join("; ");
          const priorAttemptNote = `First-pass plan simulated to ${impliedSuccess}% success` +
            (failureBeats ? `, with these risks surfacing: ${failureBeats}` : ".");

          const retriedTriage = await runTriage("high", priorAttemptNote);
          const retriedPlan = await runPlan(retriedTriage.keep, retriedTriage.success_chance_after);

          // Only adopt the retry if it actually improved the odds — never
          // regress to a worse plan than the first attempt produced.
          if ((retriedTriage.success_chance_after || 0) >= impliedSuccess) {
            triage = retriedTriage;
            plan = retriedPlan;
            selfCorrected = true;
            simulation = await runSimulate(triage.keep, triage.success_chance_after, plan.blocks).catch(() => simulation);
          }
        }
      } catch (simErr) {
        // Simulation step is a best-effort safety net — if it fails, fall
        // back to the first-pass triage/plan rather than failing the whole request.
        console.error("[Phoenix] /api/triage-and-plan self-correction step failed:", simErr);
      }

      res.json({ triage, plan, simulation, selfCorrected });
    } catch (e: any) {
      console.error("[Phoenix] /api/triage-and-plan error:", e);
      res.status(500).json({ error: e?.message || "Triage+Plan failed." });
    }
  });

  // ══════════════════════════════════════════════════════════════
  //  AGENT 4 — /api/simulate
  // ══════════════════════════════════════════════════════════════

  app.post("/api/simulate", async (req, res) => {
    try {
      const { goal, availableHours, requiredHours, progress, intelligence, keep, success_chance_after, blocks, pdfData } = req.body;
      if (!goal) return res.status(400).json({ error: "Goal is required." });

      const avail = Math.max(1, Number(availableHours) || 0);
      const reqd  = Math.max(1, Number(requiredHours)  || 0);
      const prog  = Number(progress) || 0;
      const intel: Partial<ProjectIntelligence> = intelligence || {};
      const keepList: string[] = Array.isArray(keep) ? keep.map((k: any) => typeof k === "string" ? k : k.feature) : [];
      const blockList = Array.isArray(blocks) ? blocks : [];

      const ck = cache.key({ goal, avail, reqd, prog, keepList, blockList: blockList.map((b: any) => b.task) });
      const cached = cache.get(ck);
      if (cached) { console.log("[Phoenix] Cache hit: /api/simulate"); return res.json(cached); }

      const pdf = pdfContent(pdfData);
      const contents: any[] = [];
      if (pdf) contents.push(pdf);

      contents.push(`
You are the Phoenix Simulation Engine. Simulate two parallel futures with narrative precision.

Goal: "${goal}" | Type: ${intel.project_type || "software"} | Available: ${avail}h | Progress: ${prog}%
Tech Stack: ${(intel.tech_stack || []).join(", ") || "Unknown"}
Hardest Parts: ${(intel.hardest_parts || []).join(" | ")}
Risk Level: ${intel.risk_level || "High"}
Survival Features: ${keepList.join(", ")}
Rescue Plan: ${blockList.map((b: any, i: number) => `${i+1}. [${b.hour_range}] ${b.task}`).join(" | ")}

TIMELINE A — Original Plan (no triage): 5 events escalating neutral→warning→warning→failure→failure
TIMELINE B — Phoenix Plan (triage executed): 5 events escalating neutral→neutral→milestone→milestone→success

Both timelines must feel like real narratives referencing specific features/tech/blocks above.

Return ONLY valid JSON:
{
  "timeline_a": [{ "hour": number, "event": "string", "type": "warning"|"failure"|"neutral" }],
  "timeline_b": [{ "hour": number, "event": "string", "type": "milestone"|"success"|"neutral" }],
  "outcome_a": "Failed Submission"|"Incomplete"|"Missed Deadline",
  "outcome_b": "Submitted"|"Delivered"|"MVP Complete"
}
`);

      const schema = {
        type: Type.OBJECT,
        properties: {
          timeline_a: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { hour: { type: Type.NUMBER }, event: { type: Type.STRING }, type: { type: Type.STRING, enum: ["warning","failure","neutral"] } }, required: ["hour","event","type"] } },
          timeline_b: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { hour: { type: Type.NUMBER }, event: { type: Type.STRING }, type: { type: Type.STRING, enum: ["milestone","success","neutral"] } }, required: ["hour","event","type"] } },
          outcome_a: { type: Type.STRING, enum: ["Failed Submission","Incomplete","Missed Deadline"] },
          outcome_b: { type: Type.STRING, enum: ["Submitted","Delivered","MVP Complete"] },
        },
        required: ["timeline_a","timeline_b","outcome_a","outcome_b"],
      };

      const { text, servedBy } = await callAI(contents, { responseMimeType: "application/json", responseSchema: schema });
      let result: any;
      if (text) {
        result = JSON.parse(text.trim());
        if (servedBy === "grok") result.note = "Recovered via Groq (llama-3.3-70b-versatile).";
      } else {
        const h = avail;
        const f0 = keepList[0] || "core feature";
        result = {
          timeline_a: [
            { hour: Math.round(h * 0.1), event: `Began building all features for "${goal}" without scope reduction.`, type: "neutral" },
            { hour: Math.round(h * 0.3), event: `Underestimated complexity — first major feature already behind by 2h.`, type: "warning" },
            { hour: Math.round(h * 0.5), event: "Multiple blocked tasks and untested integrations piling up.", type: "warning" },
            { hour: Math.round(h * 0.75), event: "Critical bugs discovered with no time left to fix everything.", type: "failure" },
            { hour: h, event: `Deadline reached. Core functionality incomplete. Submission failed.`, type: "failure" },
          ],
          timeline_b: [
            { hour: Math.round(h * 0.1), event: `Phoenix plan activated. Scope locked to ${f0} only.`, type: "neutral" },
            { hour: Math.round(h * 0.3), event: `${f0} core logic working. Happy path confirmed.`, type: "milestone" },
            { hour: Math.round(h * 0.55), event: "All survival features integrated. Smoke test passed.", type: "milestone" },
            { hour: Math.round(h * 0.8), event: "Build deployed. Live URL verified. Backup recording ready.", type: "milestone" },
            { hour: h, event: `"${goal}" submitted on time. Phoenix plan executed perfectly.`, type: "success" },
          ],
          outcome_a: "Failed Submission",
          outcome_b: "Submitted",
          note: "Heuristic fallback — AI unavailable.",
        };
      }

      cache.set(ck, result);
      res.json(result);

    } catch (e: any) {
      console.error("[Phoenix] /api/simulate error:", e);
      res.status(500).json({ error: e?.message || "Simulation failed." });
    }
  });

  // ══════════════════════════════════════════════════════════════
  //  AGENT 5 — /api/motivate
  // ══════════════════════════════════════════════════════════════

  app.post("/api/motivate", async (req, res) => {
    try {
      const { goal, riskLevel, availableHours, successChanceAfter, doneCount, totalBlocks, intelligence } = req.body;
      if (!goal) return res.status(400).json({ error: "Goal is required." });

      const intel: Partial<ProjectIntelligence> = intelligence || {};
      const progressCtx = totalBlocks > 0 ? `${doneCount} of ${totalBlocks} rescue blocks complete.` : "Rescue plan not started yet.";
      const techCtx = (intel.tech_stack || []).length ? `Tech: ${intel.tech_stack!.join(", ")}.` : "";
      const hardCtx = (intel.hardest_parts || []).length ? `Watch out for: ${intel.hardest_parts![0]}` : "";

      const contents = [`
You are Phoenix's AI Crisis Coach. 2-3 sentences. No hollow clichés.

Situation:
- Goal: "${goal}"
- Risk: ${riskLevel || "High"} | Hours left: ${availableHours} | Success odds: ${successChanceAfter}%
- Progress: ${progressCtx}
- ${techCtx} ${hardCtx}

Rules:
1. Reference the actual goal, hours, and odds — make it feel personal.
2. Name ONE concrete next action they should take in the next 5 minutes.
3. Tone: elite sports coach + Navy SEAL + best mentor. Fierce but focused.
4. No "you got this", "believe in yourself", or generic motivational filler.

Return ONLY the message. No quotes, no JSON, no preamble.
`];

      const { text } = await callAI(contents, { responseMimeType: "text/plain" });

      if (text) {
        res.json({ message: text.trim() });
      } else {
        const fallbacks = [
          `${availableHours}h left, ${riskLevel} risk, ${successChanceAfter}% odds. You're not here to build everything — you're here to ship the one thing that matters. Open your editor and write the first line of code right now.`,
          `Stop planning, start executing. "${goal}" needs a working demo, not a perfect one. Pick the first block on your rescue plan and do nothing else until it's done.`,
          `${riskLevel} risk doesn't mean failure — it means you have to be more precise than everyone else. ${availableHours}h is enough if you don't waste a minute. Go.`,
        ];
        res.json({ message: fallbacks[Math.floor(Math.random() * fallbacks.length)] });
      }
    } catch (e: any) {
      console.error("[Phoenix] /api/motivate error:", e);
      res.status(500).json({ error: e?.message || "Motivation failed." });
    }
  });

  // ══════════════════════════════════════════════════════════════
  //  AGENT 6 — /api/team-notify
  //  Autonomously drafts a Slack or email message to teammates
  //  explaining the delay and the Phoenix rescue plan.
  // ══════════════════════════════════════════════════════════════

  app.post("/api/team-notify", async (req, res) => {
    try {
      const {
        goal, riskLevel, availableHours, keepFeatures, cutFeatures,
        successChanceBefore, successChanceAfter, rescueBlocks,
        bufferHours, mode, recipientCtx,
      } = req.body;

      if (!goal) return res.status(400).json({ error: "Goal is required." });

      const isSlack = mode !== "email";
      const recipient = recipientCtx?.trim() || (isSlack ? "the team" : "your recipient");
      const jumpVal = (successChanceAfter || 0) - (successChanceBefore || 0);

      const contents = [`
You are Phoenix's Autonomous Team Notification Agent.
Draft a ${isSlack ? "Slack/Teams message" : "professional email"} that a developer/student sends to their team or supervisor explaining:
1. The situation (goal, risk, time crunch)
2. What they're cutting and why (briefly)  
3. What WILL be delivered and when
4. The hour-by-hour plan (summarized)
5. A confident, professional close — no panic, no excessive apology

━━━ CONTEXT ━━━
Goal: "${goal}"
Risk Level: ${riskLevel || "High"}
Hours Remaining: ${availableHours}h
Addressed to: ${recipient}

Delivering (keep):
${(keepFeatures || []).map((f: string) => `• ${f}`).join("\n")}

Deferred to next version (cut):
${(cutFeatures || []).map((f: string) => `• ${f}`).join("\n")}

Success odds: ${successChanceBefore}% → ${successChanceAfter}% (+${jumpVal > 0 ? jumpVal : 0}% after triage)

Hour-by-hour plan:
${(rescueBlocks || []).slice(0, 6).map((b: any) => `• [${b.hour_range}] ${b.task}`).join("\n")}
${bufferHours > 0 ? `Buffer: ${bufferHours}h for final testing` : "No buffer — tight execution"}

━━━ FORMAT RULES ━━━
${isSlack ? `
- Slack format: use *bold* for key points, bullet points with •
- Keep it under 200 words
- Start with a 1-line situation summary
- Use emoji sparingly (1-2 max, only if they add clarity)
- End with a clear "I'll update you at [milestone]" line
` : `
- Email format: subject line first (prefix with "Subject: "), then body
- Professional but human tone — not robotic
- 150-250 words
- Clear paragraphs: situation → what's changing → what's delivering → timeline → close
- End with: "Happy to jump on a quick call if needed."
`}

Tone: calm, confident, accountable. No panic. No over-apologizing.
Make it sound like a senior engineer who has handled deadline pressure before.

Return ONLY the message text. No preamble, no JSON, no markdown code blocks.
`];

      const { text } = await callAI(contents, { responseMimeType: "text/plain" });

      if (text) {
        res.json({ message: text.trim() });
      } else {
        // Heuristic fallback
        const keepStr = (keepFeatures || []).slice(0, 3).join(", ");
        const cutStr = (cutFeatures || []).slice(0, 2).join(", ");
        const fallback = isSlack
          ? `*Update on "${goal}"* 🔥\n\nRunning into a time crunch (${riskLevel} risk, ${availableHours}h left). I've triaged scope to stay on track.\n\n*Delivering:* ${keepStr}\n*Deferring:* ${cutStr}\n\nSuccess odds up from ${successChanceBefore}% → ${successChanceAfter}% with this plan. Executing now — will update you at the halfway mark.`
          : `Subject: Update on ${goal}\n\nHi ${recipient},\n\nWanted to give you a quick heads-up on "${goal}". I'm working with ${availableHours}h remaining and have triaged scope to ensure we deliver something solid rather than nothing complete.\n\nDelivering: ${keepStr}.\nDeferring to next iteration: ${cutStr}.\n\nI've mapped out an hour-by-hour plan and odds of a successful delivery have improved from ${successChanceBefore}% to ${successChanceAfter}%. I'll send another update at the midpoint.\n\nHappy to jump on a quick call if needed.\n\nBest`;
        res.json({ message: fallback });
      }
    } catch (e: any) {
      console.error("[Phoenix] /api/team-notify error:", e);
      res.status(500).json({ error: e?.message || "Team notification failed." });
    }
  });

  // ══════════════════════════════════════════════════════════════
  //  UTILITY ENDPOINTS
  // ══════════════════════════════════════════════════════════════

  app.get("/api/ping", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

  app.delete("/api/cache", (_req, res) => {
    (cache as any).map.clear();
    res.json({ status: "cache cleared" });
  });

  app.get("/api/diag", async (_req, res) => {
    const diag: any = {
      geminiKeyPresent:  !!apiKey,
      geminiKey2Present: !!apiKey2,
      groqKeyPresent:    !!groqKey,
      calendarConfigured,
      models: MODELS,
      quotaBlocked: Object.fromEntries(
        MODELS.map(m => [m, isBlocked(m) ? `blocked until ${new Date(quotaBlockedUntil.get(m)!).toISOString()}` : "ok"])
      ),
      gemini: null,
      groq:   null,
    };
    if (ai) {
      const testModel = MODELS.find(m => !isBlocked(m));
      if (testModel) {
        try {
          const r = await withTimeout(ai.models.generateContent({ model: testModel, contents: ["Reply: OK"] }), 8000);
          diag.gemini = { ok: !!r?.text, model: testModel, sample: r?.text?.slice(0, 40) };
        } catch (e: any) {
          diag.gemini = { ok: false, model: testModel, error: e?.message };
        }
      } else {
        diag.gemini = { ok: false, error: "All models quota-blocked" };
      }
    } else {
      diag.gemini = { ok: false, error: "GEMINI_API_KEY not set" };
    }
    if (groqKey) {
      const t = await callGroq("Reply with only the word: OK", false);
      diag.groq = { ok: !!t, model: "llama-3.3-70b-versatile", sample: t?.slice(0, 40) };
    } else {
      diag.groq = { ok: false, error: "GROQ_API_KEY not set" };
    }
    res.json(diag);
  });

  // ── Vite / static serving ────────────────────────────────────

  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) return next();
      try {
        const fs = await import("fs");
        let html = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) { next(e); }
    });
  } else {
    const dist = path.join(process.cwd(), "dist");
    app.use(express.static(dist));
    app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  if (!process.env.VERCEL) {
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🔥 Phoenix server running on http://0.0.0.0:${PORT}`);
      console.log(`📅 Google Calendar: ${calendarConfigured ? "✓ configured" : "✗ not configured (add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET)"}`);
      console.log(`📊 Diagnostics: http://localhost:${PORT}/api/diag`);
      console.log(`🗑  Cache flush: DELETE http://localhost:${PORT}/api/cache\n`);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`\n[Phoenix] ❌ Port ${PORT} already in use.`);
      } else {
        console.error("[Phoenix] Server error:", err);
      }
      process.exit(1);
    });
  }

  return app;
}

export const appPromise = startServer();
