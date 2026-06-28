import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar, Check, ExternalLink, RefreshCw,
  AlertTriangle, LogOut, Clock, Zap, Info,
} from "lucide-react";

interface RescueBlock {
  hour_range: string;
  task: string;
  type: string;
}

interface CalendarSyncProps {
  goal: string;
  riskLevel: string;
  keepFeatures: string[];
  successChanceBefore: number;
  successChanceAfter: number;
  rescueBlocks: RescueBlock[];
}

type AuthState = "checking" | "unconfigured" | "unauthenticated" | "authenticated";
type SyncState = "idle" | "syncing" | "done" | "error";

export default function CalendarSync({
  goal,
  riskLevel,
  keepFeatures,
  successChanceBefore,
  successChanceAfter,
  rescueBlocks,
}: CalendarSyncProps) {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncResult, setSyncResult] = useState<{ created: number; calendarLink: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBypassTip, setShowBypassTip] = useState(false);
  const [startTime, setStartTime] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const checkStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/calendar/status");
      const d = await r.json();
      if (!d.configured) setAuthState("unconfigured");
      else if (d.authenticated) setAuthState("authenticated");
      else setAuthState("unauthenticated");
    } catch {
      setAuthState("unauthenticated");
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const params = new URLSearchParams(window.location.search);
    const calParam = params.get("calendar");
    if (calParam === "ready") {
      window.history.replaceState({}, "", window.location.pathname);
      checkStatus();
    } else if (calParam === "denied") {
      window.history.replaceState({}, "", window.location.pathname);
      setAuthState("unauthenticated");
      setShowBypassTip(true);
    } else if (calParam === "error") {
      window.history.replaceState({}, "", window.location.pathname);
      setError("Google blocked the connection — see the tip below.");
      setShowBypassTip(true);
      setAuthState("unauthenticated");
    }
  }, [checkStatus]);

  const handleConnect = () => {
    setShowBypassTip(false);
    window.location.href = "/api/calendar/auth";
  };

  const handleDisconnect = async () => {
    await fetch("/api/calendar/revoke", { method: "POST" });
    setAuthState("unauthenticated");
    setSyncState("idle");
    setSyncResult(null);
  };

  const handleSync = async () => {
    setSyncState("syncing");
    setError(null);
    try {
      const r = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          startISO: new Date(startTime).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          rescueBlocks,
          keepFeatures,
          successChanceBefore,
          successChanceAfter,
          riskLevel,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 401) {
          setAuthState("unauthenticated");
          throw new Error("Session expired — please reconnect Google Calendar.");
        }
        throw new Error(d.error || `Server error ${r.status}`);
      }
      setSyncResult({ created: d.created, calendarLink: d.calendarLink });
      setSyncState("done");
    } catch (e: any) {
      setError(e?.message || "Failed to sync to Google Calendar.");
      setSyncState("error");
    }
  };

  // ── Bypass tip banner ─────────────────────────────────────────
  const BypassTip = () => (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 space-y-2"
    >
      <div className="flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-amber-300">Google shows a warning — here's how to get past it</span>
      </div>
      <ol className="text-[10px] text-amber-200/70 font-mono space-y-1.5 pl-1">
        <li>1. Click <strong className="text-amber-200">Connect Google Calendar</strong> below</li>
        <li>2. Google shows <strong className="text-amber-200">"Google hasn't verified this app"</strong></li>
        <li>3. Click <strong className="text-amber-200">"Advanced"</strong> (bottom left)</li>
        <li>4. Click <strong className="text-amber-200">"Go to Phoenix (unsafe)"</strong></li>
        <li>5. Click <strong className="text-amber-200">Allow</strong> — you're connected ✓</li>
      </ol>
      <p className="text-[9px] text-amber-500/60 font-mono">
        Phoenix only requests calendar.events permission — it cannot read your emails or other data.
      </p>
    </motion.div>
  );

  if (authState === "unconfigured") {
    return (
      <div className="mt-6 bg-zinc-950/60 border border-zinc-800/80 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-semibold">Google Calendar</span>
        </div>
        <div className="px-4 py-4 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-amber-300 font-semibold">Not configured</p>
            <p className="text-[11px] text-zinc-500 font-mono mt-1 leading-relaxed">
              Add <code className="text-zinc-400">GOOGLE_CLIENT_ID</code> and{" "}
              <code className="text-zinc-400">GOOGLE_CLIENT_SECRET</code> to your{" "}
              <code className="text-zinc-400">.env</code> file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-zinc-950/60 border border-zinc-800/80 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-semibold">Google Calendar</span>
          {authState === "authenticated" && (
            <span className="text-[9px] font-mono text-emerald-500 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded">● Connected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {authState === "unauthenticated" && !showBypassTip && (
            <button
              type="button"
              onClick={() => setShowBypassTip(v => !v)}
              className="text-[10px] font-mono text-amber-600 hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              <Info className="w-3 h-3" /> getting blocked?
            </button>
          )}
          {authState === "authenticated" && (
            <button type="button" onClick={handleDisconnect}
              className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors">
              <LogOut className="w-3 h-3" /> disconnect
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <AnimatePresence mode="wait">

          {authState === "checking" && (
            <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking connection…
            </motion.div>
          )}

          {authState === "unauthenticated" && (
            <motion.div key="unauth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3">

              {showBypassTip && <BypassTip />}

              <p className="text-[11px] text-zinc-500 font-mono leading-relaxed">
                Connect Google Calendar to push each rescue block as a timed event — colour-coded by task type with 2-min popup reminders.
              </p>

              {error && (
                <div className="flex items-center gap-2 text-[10px] text-red-400 font-mono bg-red-950/20 border border-red-500/20 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />{error}
                </div>
              )}

              <button type="button" onClick={handleConnect}
                className="w-full flex items-center justify-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-200 font-semibold py-3 px-4 rounded-xl transition-all text-sm group">
                <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Connect Google Calendar
                <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-80 transition-opacity" />
              </button>

              {!showBypassTip && (
                <button
                  type="button"
                  onClick={() => setShowBypassTip(true)}
                  className="w-full text-[10px] font-mono text-zinc-600 hover:text-amber-500 transition-colors text-center"
                >
                  seeing "Access blocked"? click here
                </button>
              )}
            </motion.div>
          )}

          {authState === "authenticated" && syncState !== "done" && (
            <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">
                  <Clock className="w-3 h-3 inline mr-1" />Rescue starts at
                </label>
                <input type="datetime-local" value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-mono px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500/50 transition-colors" />
                <p className="text-[10px] text-zinc-600 font-mono mt-1">Blocks are scheduled sequentially from this time.</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="text-[9px] font-mono text-blue-400 bg-blue-950/30 px-2 py-1 rounded border border-blue-500/20">{rescueBlocks.length} timed events</span>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-500/20">colour-coded by type</span>
                <span className="text-[9px] font-mono text-amber-400 bg-amber-950/30 px-2 py-1 rounded border border-amber-500/20">2-min popup reminders</span>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-[10px] text-red-400 font-mono bg-red-950/20 border border-red-500/20 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />{error}
                </div>
              )}

              <button type="button" onClick={handleSync} disabled={syncState === "syncing"}
                className="w-full flex items-center justify-center gap-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/60 text-blue-300 font-semibold py-3 px-4 rounded-xl transition-all text-sm disabled:opacity-60 group">
                {syncState === "syncing"
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Adding to Calendar…</>
                  : <><Zap className="w-4 h-4 group-hover:scale-110 transition-transform" /> Push {rescueBlocks.length} blocks to Google Calendar</>}
              </button>
            </motion.div>
          )}

          {syncState === "done" && syncResult && (
            <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-3">
              <div className="flex items-start gap-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4">
                <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-emerald-300">{syncResult.created} events added to Google Calendar</div>
                  <div className="text-[10px] text-emerald-600 font-mono mt-0.5">Each rescue block is now a timed event with 2-min reminders.</div>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={syncResult.calendarLink} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold py-2.5 rounded-xl transition-all">
                  <ExternalLink className="w-3.5 h-3.5" /> Open Google Calendar
                </a>
                <button type="button" onClick={() => { setSyncState("idle"); setSyncResult(null); }}
                  className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 px-3 transition-colors">
                  sync again
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}