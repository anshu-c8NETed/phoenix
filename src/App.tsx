import React, { useState, useRef, useLayoutEffect } from "react";
import LandingPage from "./LandingPage";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CrisisSpine, { CrisisSpineHandle } from "./CrisisSpine";
import {
  Flame, Hourglass, Clock, AlertTriangle, Upload, FileText, X,
  ChevronRight, ShieldAlert, Compass, Zap, RefreshCw, Sparkles,
  Info, Wrench, CheckSquare, Rocket, Presentation, GitBranch,
  Save, RotateCcw, Cpu, Code2, BookOpen, Layers,
} from "lucide-react";
import ExportPanel from "./ExportPanel";
import ChecklistTracker from "./ChecklistTracker";
import AIMotivator from "./AIMotivator";
import CalendarSync from "./CalendarSync";
import VoiceInput from "./VoiceInput";
import TeamNotify from "./Teamnotify";
import { saveSession, loadSession, clearSession, getSessionAge, PhoenixSession } from "./sessionStore";
import { motion, AnimatePresence } from "motion/react";
import { auth, isConfigured as firebaseConfigured } from "./firebaseConfig";
import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from "firebase/auth";

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ProjectIntelligence {
  project_type: "software" | "document" | "research" | "pitch";
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

interface KeepFeature {
  feature: string;
  confidence: number;
  reason: string;
  shortcut: string;
}

interface CutFeature {
  feature: string;
  reason: string;
  fake_strategy: string;
}

interface SurvivalResponse {
  keep: KeepFeature[];
  cut: CutFeature[];
  success_chance_before: number;
  success_chance_after: number;
  note?: string;
}

interface RescueBlock {
  hour_range: string;
  task: string;
  type: "build" | "test" | "deploy" | "pitch" | "write" | "review" | "format" | "submit" | "analyze" | "synthesize" | "cite" | "draft" | "design" | "rehearse" | "record" | "finalize" | "debug";
  risk_tag: "critical_path" | "high_risk" | "normal" | "buffer";
}

interface RescueResponse {
  blocks: RescueBlock[];
  total_hours_planned: number;
  buffer_hours: number;
  critical_path_block: number;
  note?: string;
}

interface SimEvent {
  hour: number;
  event: string;
  type: "warning" | "failure" | "neutral" | "milestone" | "success";
}

interface SimulationResponse {
  timeline_a: SimEvent[];
  timeline_b: SimEvent[];
  outcome_a: "Failed Submission" | "Incomplete" | "Missed Deadline";
  outcome_b: "Submitted" | "Delivered" | "MVP Complete";
  note?: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MAX_PDF_BYTES = 10 * 1024 * 1024;

const PRESETS = [
  {
    title: "📚 Exam tomorrow",
    goal: "Pass Data Structures & Algorithms exam",
    availableHours: 10,
    requiredHours: 24,
    progress: 20,
    features: "Arrays & Linked Lists\nTrees & Graphs\nDynamic Programming\nSorting Algorithms\nBig-O Analysis\nRecursion Problems\nHash Maps\nPast Papers",
    badge: true,
  },
  {
    title: "💼 Project deadline",
    goal: "Submit final year capstone project",
    availableHours: 18,
    requiredHours: 30,
    progress: 35,
    features: "Core Feature Implementation\nDatabase Setup\nUser Interface\nTesting Suite\nDocumentation\nDeployment\nPresentation Slides",
  },
  {
    title: "🎤 Interview in the morning",
    goal: "Prepare for Google SWE technical interview",
    availableHours: 8,
    requiredHours: 20,
    progress: 25,
    features: "LeetCode Medium Arrays\nSystem Design Basics\nBehavioral STAR Stories\nCompany Research\nRecursion & DFS\nDynamic Programming Patterns\nMock Interview Run-through",
  },
  {
    title: "🚀 Hackathon demo",
    goal: "Ship hackathon MVP before judging",
    availableHours: 6,
    requiredHours: 18,
    progress: 15,
    features: "Landing Page\nCore Feature Flow\nAPI Integration\nDemo Data Seeding\nDeploy to Production\nPitch Slide\nUser Auth\nMobile Responsive",
  },
];

const LOADING_STEPS = [
  "Reading project specification...",
  "Extracting tech stack and risk factors...",
  "Analysing deadline gap...",
  "Scoring risk dimensions...",
  "Building crisis intelligence report...",
];

const TRIAGE_LOADING_STEPS = [
  "Mapping feature dependencies...",
  "Calculating build time per feature...",
  "Triaging scope ruthlessly...",
  "Building rescue schedule...",
  "Locking execution path...",
];

const SIMULATION_LOADING_STEPS = [
  "Simulating original trajectory...",
  "Modelling Phoenix recovery path...",
  "Projecting final outcomes...",
  "Rendering parallel futures...",
];

const AGENTS = [
  {
    num: "01", name: "Crisis Assessment",
    desc: "Reads your situation and extracts what's actually hard, what's already done, what could block you, and your escape strategy if time runs out.",
    accent: "text-red-400" as const, icon: ShieldAlert,
    tags: ["Deep Analysis", "Any Situation", "Intel Backbone"],
    tagColor: "text-red-400/90 border-red-500/25 bg-red-500/[0.07]",
    glow: "from-red-500/[0.07]", iconColor: "#EF4444", iconBg: "rgba(239,68,68,0.12)", hoverName: "group-hover:text-red-300",
  },
  {
    num: "02", name: "Survival Version Generator",
    desc: "Triages your topic/task list ruthlessly — what to keep, what to skip, and exactly how to cut corners without failing. Specific reasons, not platitudes.",
    accent: "text-orange-400" as const, icon: Sparkles,
    tags: ["Scope Triage", "Shortcuts", "+60% Odds"],
    tagColor: "text-orange-400/90 border-orange-500/25 bg-orange-500/[0.07]",
    glow: "from-orange-500/[0.07]", iconColor: "#F97316", iconBg: "rgba(249,115,22,0.12)", hoverName: "group-hover:text-orange-300",
  },
  {
    num: "03", name: "Rescue Planner",
    desc: "Generates a concrete, minute-by-minute execution schedule based on your specific situation — not generic advice but actionable tasks you start immediately.",
    accent: "text-blue-400" as const, icon: Compass,
    tags: ["Hour-by-Hour", "Actionable", "Situation-Aware"],
    tagColor: "text-blue-400/90 border-blue-500/25 bg-blue-500/[0.07]",
    glow: "from-blue-500/[0.07]", iconColor: "#60A5FA", iconBg: "rgba(96,165,250,0.12)", hoverName: "group-hover:text-blue-300",
  },
  {
    num: "04", name: "Simulation Engine",
    desc: "Simulates two parallel futures — what happens if you keep the original plan vs. what happens if you execute the Phoenix plan. Watch them diverge.",
    accent: "text-violet-400" as const, icon: GitBranch,
    tags: ["Parallel Futures", "Timeline A/B", "Live Sim"],
    tagColor: "text-violet-400/90 border-violet-500/25 bg-violet-500/[0.07]",
    glow: "from-violet-500/[0.07]", iconColor: "#A78BFA", iconBg: "rgba(167,139,250,0.12)", hoverName: "group-hover:text-violet-300",
  },
];

// ─────────────────────────────────────────────
// AnimatedChance
// ─────────────────────────────────────────────

function AnimatedChance({ before, after, onLockIn }: { before: number; after: number; onLockIn?: () => void }) {
  const safeBefore = Number(before) || 0;
  const safeAfter = Number(after) || 0;

  const beforeNumRef = useRef<HTMLDivElement>(null);
  const afterNumRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const jumpBadgeRef = useRef<HTMLSpanElement>(null);

  // Ring geometry — circumference used for stroke-dashoffset sweep
  const RADIUS = 26;
  const CIRC = 2 * Math.PI * RADIUS;

  React.useEffect(() => {
    const beforeEl = beforeNumRef.current;
    const afterEl = afterNumRef.current;
    const ring = ringRef.current;
    if (!beforeEl || !afterEl || !ring) return;

    // Start state: ring empty, numbers at zero, badge hidden
    gsap.set(ring, { strokeDashoffset: CIRC });
    const counters = { before: 0, after: 0 };

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => onLockIn?.(),
    });

    // Both counters climb together — the "before" settles quickly since
    // it's the smaller, grim number; "after" keeps climbing as the ring fills.
    tl.to(counters, {
      before: safeBefore,
      duration: 0.7,
      onUpdate: () => { beforeEl.textContent = `${Math.round(counters.before)}%`; },
    }, 0);

    tl.to(counters, {
      after: safeAfter,
      duration: 1.3,
      ease: "power3.out",
      onUpdate: () => { afterEl.textContent = `${Math.round(counters.after)}%`; },
    }, 0.15);

    // Ring sweep — fills exactly as the "after" number climbs, same duration/ease
    tl.to(ring, {
      strokeDashoffset: CIRC - (CIRC * safeAfter) / 100,
      duration: 1.3,
      ease: "power3.out",
    }, 0.15);

    // Jump badge pops in once both numbers have basically landed
    if (jumpBadgeRef.current) {
      tl.fromTo(
        jumpBadgeRef.current,
        { opacity: 0, scale: 0.7 },
        { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" },
        1.1
      );
    }

    return () => { tl.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeBefore, safeAfter]);

  const jumpValue = safeAfter - safeBefore;

  return (
    <div className="bg-zinc-950/60 p-5 rounded-xl border border-zinc-800/80 mt-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
      <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-emerald-400" />Calculated Survival Odds
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
        <div className="text-center bg-zinc-900/40 p-4 rounded-lg border border-zinc-800">
          <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Original Plan</span>
          <div ref={beforeNumRef} className="text-3xl font-extrabold text-red-500 leading-none">0%</div>
          <span className="text-[10px] text-zinc-600 block mt-1.5 font-mono">Severe deadline risk</span>
        </div>
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-full flex items-center gap-2 mb-1">
            <div className="h-px bg-zinc-800 flex-grow" />
            <span ref={jumpBadgeRef} className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-1 rounded-full" style={{ opacity: 0 }}>
              +{jumpValue > 0 ? jumpValue : 0}% Jump
            </span>
            <div className="h-px bg-zinc-800 flex-grow" />
          </div>
          <span className="text-[9px] font-mono text-zinc-500">By executing scope triage</span>
        </div>
        <div className="text-center bg-emerald-950/15 p-4 rounded-lg border border-emerald-500/20 relative">
          <span className="block text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-2">Phoenix Plan</span>
          {/* Radial progress ring — fills in sync with the counter via GSAP stroke-dashoffset */}
          <div className="relative w-[72px] h-[72px] mx-auto">
            <svg width="72" height="72" viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
              <circle cx="36" cy="36" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="5" className="text-zinc-800" />
              <circle
                ref={ringRef}
                cx="36" cy="36" r={RADIUS} fill="none"
                stroke="currentColor" strokeWidth="5" strokeLinecap="round"
                className="text-emerald-400"
                strokeDasharray={CIRC}
              />
            </svg>
            <div ref={afterNumRef} className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-emerald-400">0%</div>
          </div>
          <span className="text-[10px] text-emerald-500/80 block mt-2 font-mono font-semibold">Highly survivable</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SimulationEngine
// ─────────────────────────────────────────────

function SimulationEngine({ data }: { data: SimulationResponse }) {
  const [visibleA, setVisibleA] = useState(0);
  const [visibleB, setVisibleB] = useState(0);

  React.useEffect(() => {
    setVisibleA(0); setVisibleB(0);
    const total = Math.max(data.timeline_a.length, data.timeline_b.length);
    let i = 0;
    const timer = setInterval(() => { i++; setVisibleA(Math.min(i, data.timeline_a.length)); setVisibleB(Math.min(i, data.timeline_b.length)); if (i >= total) clearInterval(timer); }, 120);
    return () => clearInterval(timer);
  }, [data]);

  const getEventStyle = (type: SimEvent["type"]) => ({
    failure: { dot: "bg-red-500", text: "text-red-400", border: "border-red-500/30", bg: "bg-red-950/20" },
    warning: { dot: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-950/20" },
    success: { dot: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-950/20" },
    milestone: { dot: "bg-blue-500", text: "text-blue-400", border: "border-blue-500/30", bg: "bg-blue-950/20" },
    neutral: { dot: "bg-zinc-500", text: "text-zinc-400", border: "border-zinc-700/30", bg: "bg-zinc-900/20" },
  }[type] || { dot: "bg-zinc-500", text: "text-zinc-400", border: "border-zinc-700/30", bg: "bg-zinc-900/20" });

  return (
    <div className="mt-6 space-y-4">
      {data.note && (
        <div className="flex items-start gap-2.5 bg-amber-950/25 border border-amber-500/20 text-amber-400 p-3 rounded-lg text-xs font-mono">
          <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>⚡ {data.note}</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Timeline A */}
        <div className="bg-zinc-950/40 border border-red-500/20 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-amber-600" />
          <h5 className="text-xs font-mono uppercase tracking-wider text-red-400 font-bold mb-4 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />Timeline A — Original Plan
          </h5>
          <div className="space-y-2">
            {data.timeline_a.slice(0, visibleA).map((event, idx) => {
              const s = getEventStyle(event.type);
              return (
                <motion.div key={idx} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${s.border} ${s.bg}`}>
                  <div className="flex-shrink-0 mt-0.5 flex flex-col items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className="text-[9px] font-mono text-zinc-600">{event.hour}h</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${s.text}`}>{event.event}</p>
                </motion.div>
              );
            })}
          </div>
          {visibleA >= data.timeline_a.length && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="mt-3 text-center py-2 px-3 rounded-lg border border-red-500/40 bg-red-950/60 text-red-300 text-xs font-mono font-bold uppercase tracking-wider">
              ✕ {data.outcome_a}
            </motion.div>
          )}
        </div>
        {/* Timeline B */}
        <div className="bg-zinc-950/40 border border-emerald-500/20 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-emerald-500" />
          <h5 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold mb-4 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Timeline B — Phoenix Plan
          </h5>
          <div className="space-y-2">
            {data.timeline_b.slice(0, visibleB).map((event, idx) => {
              const s = getEventStyle(event.type);
              return (
                <motion.div key={idx} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${s.border} ${s.bg}`}>
                  <div className="flex-shrink-0 mt-0.5 flex flex-col items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className="text-[9px] font-mono text-zinc-600">{event.hour}h</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${s.text}`}>{event.event}</p>
                </motion.div>
              );
            })}
          </div>
          {visibleB >= data.timeline_b.length && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="mt-3 text-center py-2 px-3 rounded-lg border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider">
              ✓ {data.outcome_b}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// IntelligencePanel — displays Agent 1 deep output
// ─────────────────────────────────────────────

function IntelligencePanel({ intel }: { intel: ProjectIntelligence }) {
  const typeIcon: Record<string, React.ReactNode> = {
    software: <Code2 className="w-3.5 h-3.5" />,
    document: <BookOpen className="w-3.5 h-3.5" />,
    research: <Cpu className="w-3.5 h-3.5" />,
    pitch: <Layers className="w-3.5 h-3.5" />,
  };

  const dimColor = (score: number) =>
    score >= 8 ? "text-red-400 bg-red-950/40 border-red-500/30"
      : score >= 6 ? "text-amber-400 bg-amber-950/40 border-amber-500/30"
        : score >= 4 ? "text-yellow-400 bg-yellow-950/30 border-yellow-500/20"
          : "text-emerald-400 bg-emerald-950/30 border-emerald-500/20";

  return (
    <div className="space-y-4 mt-4">
      {/* Project type + tech stack */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300">
          {typeIcon[intel.project_type]}<span className="uppercase tracking-wider">{intel.project_type}</span>
        </span>
        {intel.tech_stack.map((t, i) => (
          <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded border border-blue-500/20 bg-blue-950/20 text-blue-300">{t}</span>
        ))}
      </div>

      {/* Hardest parts — the new key insight */}
      {intel.hardest_parts.length > 0 && (
        <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-xl">
          <h5 className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold mb-2.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />What Will Actually Blow Up
          </h5>
          <ul className="space-y-2">
            {intel.hardest_parts.map((p, i) => (
              <li key={i} className="text-xs text-red-200/80 flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-red-500 flex-shrink-0" /><span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Already done */}
        {intel.already_done.length > 0 && (
          <div className="bg-emerald-950/15 border border-emerald-500/15 p-3.5 rounded-xl">
            <h5 className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold mb-2">Already Done</h5>
            <ul className="space-y-1.5">
              {intel.already_done.map((d, i) => (
                <li key={i} className="text-xs text-emerald-200/70 flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold text-sm leading-none mt-0.5">✓</span><span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Biggest unknowns */}
        {intel.biggest_unknowns.length > 0 && (
          <div className="bg-amber-950/15 border border-amber-500/15 p-3.5 rounded-xl">
            <h5 className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-2">Watch Out For</h5>
            <ul className="space-y-1.5">
              {intel.biggest_unknowns.map((u, i) => (
                <li key={i} className="text-xs text-amber-200/70 flex items-start gap-1.5">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" /><span>{u}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Demo escape strategy */}
      {intel.demo_strategy && (
        <div className="bg-violet-950/20 border border-violet-500/20 p-3.5 rounded-xl flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-bold block mb-1">Demo Escape Strategy</span>
            <p className="text-xs text-violet-200/80 leading-relaxed">{intel.demo_strategy}</p>
          </div>
        </div>
      )}

      {/* Risk dimensions */}
      {intel.risk_dimensions.length > 0 && (
        <div>
          <h5 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-2">Risk Dimensions</h5>
          <div className="grid grid-cols-1 gap-1.5">
            {intel.risk_dimensions.map((d, i) => (
              <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs ${dimColor(d.score)}`}>
                <span className="font-mono font-bold w-16 flex-shrink-0">{d.dimension}</span>
                <div className="flex-1 bg-zinc-900/60 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-current opacity-70 transition-all" style={{ width: `${d.score * 10}%` }} />
                </div>
                <span className="font-bold font-mono w-4 text-right flex-shrink-0">{d.score}</span>
                <span className="text-zinc-400 text-[10px] leading-snug flex-1 hidden sm:block">{d.reasoning}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Agent-specific loading visuals
// Replace the generic spinner+text pattern with a small visualization
// of the SHAPE of what's coming — risk bars for diagnosis, a keep/cut
// split for triage, diverging paths for simulation. Same rotating
// step-text is kept underneath since the copy itself is informative;
// only the icon-equivalent changes.
// ─────────────────────────────────────────────

function DiagnoseLoader() {
  const heights = [0.9, 0.55, 0.8, 0.4, 0.7];
  return (
    <div className="flex items-end gap-1.5 h-9" aria-hidden>
      {heights.map((h, i) => (
        <div key={i}
          className="risk-bar w-2 rounded-sm bg-gradient-to-t from-red-500 to-amber-400"
          style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}

function TriageLoader() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <div className="flex flex-col gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="sort-row h-1.5 w-7 rounded-full bg-emerald-500/70" style={{ animationDelay: `${i * 0.15}s`, "--drift": "5px" } as React.CSSProperties} />
        ))}
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-zinc-700 flex-shrink-0" />
      <div className="flex flex-col gap-1">
        {[0, 1].map((i) => (
          <div key={i} className="sort-row h-1.5 w-5 rounded-full bg-red-500/50" style={{ animationDelay: `${i * 0.15 + 0.3}s`, "--drift": "-5px" } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}

function SimulateLoader() {
  return (
    <svg width="56" height="36" viewBox="0 0 56 36" aria-hidden>
      <circle cx="4" cy="18" r="2.5" fill="#A78BFA" />
      <path d="M6,18 C20,18 24,4 50,4" stroke="#EF4444" strokeWidth="1.5" fill="none" className="diverge-path" opacity="0.8" />
      <path d="M6,18 C20,18 24,32 50,32" stroke="#34D399" strokeWidth="1.5" fill="none" className="diverge-path" opacity="0.8" style={{ animationDelay: "0.3s" }} />
      <circle cx="50" cy="4" r="2" fill="#EF4444" />
      <circle cx="50" cy="32" r="2" fill="#34D399" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// AgentsShowcase
// Rebuilt on real React state instead of imperative mouseenter/
// mouseleave ref callbacks — the old version never opened on touch
// devices, so mobile visitors saw numbers and names only, never the
// description or tags. Tap-to-expand now works everywhere; hover is
// layered on top for desktop as a progressive enhancement, and the
// active card additionally gets a "live" pulse on its connector dot
// to sell the four-agent relay rather than four independent rows.
// ─────────────────────────────────────────────

function AgentsShowcase() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const isTouchRef = useRef(false);

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-8 relative">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-7">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-red-500/80">The Recovery Stack</span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-3">
          4 AI Agents.<br /><span className="text-zinc-700">One coordinated rescue.</span>
        </h2>
        <p className="text-[12px] font-mono text-zinc-600 mb-10 md:mb-14">
          {activeIdx === null ? "Tap or hover any agent — each one feeds the next." : "→ Output flows straight into the next agent's input."}
        </p>

        <div className="flex flex-col relative">
          {/* Connector spine — a continuous line threading every row,
              echoing CrisisSpine's "this feeds everything below it"
              language so the pre-run showcase and the post-run results
              read as the same visual idea. */}
          <div className="absolute left-[19px] md:left-[25px] top-2 bottom-2 w-px bg-gradient-to-b from-red-500/25 via-blue-500/25 to-violet-500/25 pointer-events-none" />

          {AGENTS.map((agent, idx) => {
            const Icon = agent.icon;
            const isActive = activeIdx === idx;
            return (
              <button
                key={agent.num}
                type="button"
                aria-expanded={isActive}
                onClick={() => setActiveIdx((p) => (p === idx ? null : idx))}
                onMouseEnter={() => { if (!isTouchRef.current) setActiveIdx(idx); }}
                onMouseLeave={() => { if (!isTouchRef.current) setActiveIdx((p) => (p === idx ? null : p)); }}
                onTouchStart={() => { isTouchRef.current = true; }}
                className="group relative grid grid-cols-[40px_1fr_40px] md:grid-cols-[52px_1fr_44px] gap-x-3 md:gap-x-5 py-5 md:py-7 border-b border-white/[0.06] first:border-t first:border-white/[0.06] overflow-hidden text-left w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded-sm"
              >
                <div className={`absolute inset-0 transition-opacity duration-500 pointer-events-none bg-gradient-to-r ${agent.glow} to-transparent ${isActive ? "opacity-100" : "opacity-0"}`} />
                <span className="relative flex items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] text-white/20 group-hover:text-white/45 transition-colors duration-300 pt-1.5 select-none">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-300 ${isActive ? "bg-current" : "bg-white/15"}`} style={isActive ? { boxShadow: `0 0 8px 1px ${agent.iconColor}`, color: agent.iconColor } : undefined} />
                  {agent.num}
                </span>
                <div className="relative flex flex-col min-w-0">
                  <span className={`text-xl sm:text-[clamp(20px,3.2vw,34px)] font-semibold tracking-[-0.03em] leading-none text-white/45 transition-colors duration-300 ${isActive ? "text-zinc-100" : ""}`}>{agent.name}</span>
                  <div
                    className="overflow-hidden transition-all duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ maxHeight: isActive ? "160px" : "0px", opacity: isActive ? 1 : 0, marginTop: isActive ? "8px" : "0px" }}
                  >
                    <p className="text-[13px] leading-relaxed text-white/45 max-w-full">{agent.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {agent.tags.map((tag, ti) => (
                        <span key={ti} className={`text-[9px] font-mono tracking-[0.14em] uppercase px-2 py-0.5 rounded-full border ${agent.tagColor}`}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={`relative flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-[10px] transition-all duration-300 mt-0.5 flex-shrink-0 ${isActive ? "scale-110" : "opacity-[0.14]"}`} style={{ background: agent.iconBg }}>
                  <Icon className={`w-4 h-4 md:w-5 md:h-5 ${agent.accent}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Stat bar — responsive padding and text */}
        <div className="mt-10 md:mt-14 grid grid-cols-3 border border-white/[0.07] rounded-2xl overflow-hidden">
          {[
            { value: "20→80%", label: "Success jump", dot: "bg-red-500/50" },
            { value: "< 2s", label: "Per agent", dot: "bg-orange-500/50" },
            { value: "Cached", label: "Demo ready", dot: "bg-blue-500/50" },
          ].map((s, i) => (
            <div key={i} className={`relative p-3 sm:p-5 md:p-6 ${i < 2 ? "border-r border-white/[0.07]" : ""}`}>
              <div className={`absolute top-3 right-3 sm:top-5 sm:right-5 w-1.5 h-1.5 rounded-full ${s.dot}`} />
              <div className="text-lg sm:text-2xl md:text-[26px] font-bold tracking-[-0.04em] text-zinc-100 leading-none mb-1">{s.value}</div>
              <div className="text-[9px] sm:text-[11px] font-mono tracking-[0.1em] uppercase text-white/30 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// ErrorBoundary
// ─────────────────────────────────────────────

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, info: any) { console.error("ErrorBoundary:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-zinc-900 border border-red-500/30 p-6 rounded-xl shadow-xl">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Application Error</h2>
            <pre className="text-left bg-zinc-950 p-3 rounded text-xs font-mono text-red-400 overflow-x-auto max-h-40 whitespace-pre-wrap">{this.state.error?.message || String(this.state.error)}</pre>
            <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded text-sm transition-colors">Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// FirebaseAuthButton
// Sits in the top-right corner of MainApp header.
// Shows nothing if Firebase isn't configured.
// Starts as anonymous, upgrades to Google on click.
// ─────────────────────────────────────────────

function FirebaseAuthButton({ user, loading }: { user: User | null; loading: boolean }) {
  const [signingIn, setSigningIn] = useState(false);

  if (!firebaseConfigured || !auth) return null;

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth!, provider);
    } catch (e: any) {
      // User dismissed popup — ignore
      if (e?.code !== "auth/popup-closed-by-user") {
        console.warn("[Phoenix] Google sign-in failed:", e?.message);
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) return null; // Not yet initialised

  const isAnon = user ? user.isAnonymous : true;

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2"
    >
      {isAnon ? (
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          title="Sign in with Google to sync your session across devices"
          className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 bg-zinc-900/60 hover:bg-zinc-800/80 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
        >
          {/* Google G icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" className="flex-shrink-0">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {signingIn ? "Signing in…" : "Sign in to sync"}
        </button>
      ) : (
        <div
          title={`Signed in as ${user.displayName || user.email || "Google user"} — session saved to Firestore`}
          className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-500/80 border border-emerald-500/20 bg-emerald-950/20 px-2.5 py-1.5 rounded-lg"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          {user.displayName?.split(" ")[0] || "Signed in"}
          <span className="text-emerald-700">· ☁ Firebase</span>
        </div>
      )}
    </motion.div>
  );
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [initialHours, setInitialHours] = useState<number | undefined>(undefined);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialise Firebase Auth: sign in anonymously so every visitor gets
  // a uid immediately. They can upgrade to Google Sign-In later.
  useLayoutEffect(() => {
    if (!firebaseConfigured || !auth) {
      setAuthLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
    });

    // Auto-sign in anonymously if no session exists yet
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((e) => {
        console.warn("[Phoenix] Anonymous sign-in failed:", e?.message);
        setAuthLoading(false);
      });
    }

    return () => unsub();
  }, []);

  const handleEnter = (deadlineHours?: number) => {
    setInitialHours(deadlineHours);
    setShowLanding(false);
  };

  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        {showLanding ? (
          <motion.div key="landing" initial={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
            <LandingPage onEnter={handleEnter} />
          </motion.div>
        ) : (
          <motion.div key="app" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.08 }} onAnimationComplete={() => ScrollTrigger.refresh()}>
            <MainApp onBack={() => setShowLanding(true)} initialHours={initialHours} firebaseUser={firebaseUser} authLoading={authLoading} />
          </motion.div>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}

// ─────────────────────────────────────────────
// EmberEcho
// A few CSS-only embers drifting up through the App shell right
// after the landing→app transition, so Phoenix's fire motif carries
// across the hard cut instead of vanishing. Self-removes after one
// pass — this is a one-time "the fire followed you in" beat, not an
// ambient background (that would compete with the actual content).
// ─────────────────────────────────────────────

function EmberEcho() {
  const [visible, setVisible] = useState(true);
  const embers = React.useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: `${5 + Math.random() * 90}%`,
    duration: 2.6 + Math.random() * 1.8,
    delay: Math.random() * 0.6,
    driftX: `${(Math.random() - 0.5) * 60}px`,
  })), []);

  React.useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4600);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" aria-hidden>
      {embers.map((e) => (
        <span key={e.id} className="app-ember" style={{
          left: e.left,
          animationDuration: `${e.duration}s`,
          animationDelay: `${e.delay}s`,
          "--drift-x": e.driftX,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MainApp
// ─────────────────────────────────────────────

function MainApp({ onBack, initialHours, firebaseUser, authLoading }: { onBack: () => void; initialHours?: number; firebaseUser: User | null; authLoading: boolean }) {
  const [goal, setGoal] = useState("");
  const [availableHours, setAvailableHours] = useState<number | "">(initialHours ?? "");
  const [progress, setProgress] = useState<number>(0);
  const [requiredHours, setRequiredHours] = useState<number | "">("");
  const [featuresText, setFeaturesText] = useState("");

  const [utcTime, setUtcTime] = useState("");
  const [deadlineCountdown, setDeadlineCountdown] = useState("");
  React.useEffect(() => {
    const startMs = Date.now();
    const deadlineMs = typeof availableHours === "number" && availableHours > 0 ? startMs + availableHours * 3600 * 1000 : null;
    const update = () => {
      const now = new Date();
      setUtcTime(`${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")}`);
      if (deadlineMs) {
        const r = Math.max(0, deadlineMs - Date.now());
        const h = Math.floor(r / 3600000), m = Math.floor((r % 3600000) / 60000), s = Math.floor((r % 60000) / 1000);
        setDeadlineCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      }
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableHours]);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfReading, setPdfReading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Agent states
  const [loading, setLoading] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<ProjectIntelligence | null>(null);

  // Agents 2+3 combined (triage-and-plan)
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageLoadingStepIdx, setTriageLoadingStepIdx] = useState(0);
  const [triageError, setTriageError] = useState<string | null>(null);
  const [survivalResult, setSurvivalResult] = useState<SurvivalResponse | null>(null);
  const [rescueResult, setRescueResult] = useState<RescueResponse | null>(null);

  // Agent 4
  const [simLoading, setSimLoading] = useState(false);
  const [simLoadingStepIdx, setSimLoadingStepIdx] = useState(0);
  const [simError, setSimError] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<SimulationResponse | null>(null);

  const [restoredSession, setRestoredSession] = useState<PhoenixSession | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const stepIntervalRef = useRef<any>(null);

  // ── Plan-reveal choreography (GSAP) ──────────────────────────
  // Refs into the results DOM so one timeline can sequence the
  // "plan assembling" moment instead of each child animating alone.
  const planRevealRef = useRef<HTMLDivElement>(null);
  const keepCutRef = useRef<HTMLDivElement>(null);
  const oddsRef = useRef<HTMLDivElement>(null);
  const rescueListRef = useRef<HTMLDivElement>(null);
  const spineLineRef = useRef<SVGLineElement>(null);
  const [spineHeight, setSpineHeight] = useState(0);
  const postPlanRef = useRef<HTMLDivElement>(null);
  const revealedForRef = useRef<string | null>(null);
  const lockInPulseRef = useRef<HTMLDivElement>(null);

  // ── Crisis Spine — the connecting thread across all 4 agents ──
  // Distinct from spineLineRef/spineHeight above (that one is local
  // to the rescue-block list inside Agent 3 only). This one spans
  // the whole results section, from Agent 1's intelligence report
  // down to wherever Agent 4's simulation currently ends.
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  const agent1RefPoint = useRef<HTMLDivElement>(null); // Agent 1 header — flicker start point
  const agent2RefPoint = useRef<HTMLDivElement>(null); // Triage header — flicker start point
  const agent4RefPoint = useRef<HTMLDivElement>(null); // Simulation header — flicker start point
  const crisisSpineRef = useRef<CrisisSpineHandle>(null);
  const [crisisSpineHeight, setCrisisSpineHeight] = useState(0);

  // Re-measure the results section height whenever the visible agent
  // results change shape (new agent mounted, content reflowed).
  useLayoutEffect(() => {
    const el = resultsSectionRef.current;
    if (!el) return;
    const measure = () => setCrisisSpineHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [intelligence, survivalResult, rescueResult, simResult]);

  // Fire a chain-down flicker from a given ref point's vertical offset
  // within the results section, down to the current spine bottom.
  const fireSpineFrom = (refPoint: React.RefObject<HTMLDivElement>) => {
    const section = resultsSectionRef.current;
    const point = refPoint.current;
    if (!section || !point) return;
    const sectionTop = section.getBoundingClientRect().top;
    const pointTop = point.getBoundingClientRect().top;
    crisisSpineRef.current?.fireFrom(pointTop - sectionTop);
  };

  // Fired by AnimatedChance once its counter + ring finish — the emotional
  // "the plan is locked in" beat. A brief radial light pulse, not a toast.
  const handleOddsLockIn = () => {
    const el = lockInPulseRef.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { opacity: 0.5, scale: 0.3 },
      { opacity: 0, scale: 2.6, duration: 0.9, ease: "power2.out" }
    );
  };

  React.useEffect(() => {
    // Defensive: works whether sessionStore exports sync or async loadSession
    const result = loadSession();
    const handle = (session: any) => {
      if (session && session.goal && (session.result || session.rescueResult)) {
        setRestoredSession(session); setShowRestoreBanner(true);
      }
    };
    if (result && typeof (result as any).then === "function") {
      (result as any).then(handle).catch(() => { });
    } else {
      handle(result);
    }
  }, []);

  const agent1FiredForRef = useRef<string | null>(null);
  const agent2FiredForRef = useRef<string | null>(null);
  const agent4FiredForRef = useRef<string | null>(null);

  React.useEffect(() => {
    if (!intelligence || !goal) return;
    if (agent1FiredForRef.current === goal) return;
    agent1FiredForRef.current = goal;
    const raf = requestAnimationFrame(() => fireSpineFrom(agent1RefPoint));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intelligence, goal]);

  React.useEffect(() => {
    if (!survivalResult || !rescueResult || !goal) return;
    if (agent2FiredForRef.current === goal) return;
    agent2FiredForRef.current = goal;
    const raf = requestAnimationFrame(() => fireSpineFrom(agent2RefPoint));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [survivalResult, rescueResult, goal]);

  React.useEffect(() => {
    if (!simResult || !goal) return;
    if (agent4FiredForRef.current === goal) return;
    agent4FiredForRef.current = goal;
    const raf = requestAnimationFrame(() => fireSpineFrom(agent4RefPoint));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simResult, goal]);

  React.useEffect(() => {
    if (intelligence || survivalResult || rescueResult || simResult) {
      saveSession({
        goal, availableHours, requiredHours, progress, featuresText,
        result: intelligence, survivalResult, rescueResult, simResult,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intelligence, survivalResult, rescueResult, simResult]);

  // ── Plan-reveal GSAP timeline ────────────────────────────────
  // Fires once per goal when both Agent 2+3 results land, choreographing
  // the keep/cut grid → odds card → rescue blocks → export/checklist/coach
  // as one "plan assembling itself" sequence rather than independent
  // per-component animations. Guarded by revealedForRef so re-renders
  // (e.g. ChecklistTracker toggles) never re-trigger it for the same plan.
  React.useEffect(() => {
    if (!survivalResult || !rescueResult) return;
    if (revealedForRef.current === goal) return;
    revealedForRef.current = goal;

    // Wait a frame so the just-mounted DOM nodes are measurable.
    const raf = requestAnimationFrame(() => {
      const keepCutCards = keepCutRef.current?.querySelectorAll<HTMLElement>("[data-reveal-card]") ?? [];
      const rescueBlocks = rescueListRef.current?.querySelectorAll<HTMLElement>("[data-reveal-block]") ?? [];
      const postPlanSections = postPlanRef.current?.querySelectorAll<HTMLElement>("[data-reveal-section]") ?? [];

      // Measure the rescue list so the spine SVG line can match its height
      // exactly, then prep it as a dash that GSAP will draw in.
      const listHeight = rescueListRef.current?.scrollHeight ?? 0;
      setSpineHeight(listHeight);
      const blockStaggerDuration = 0.4 + rescueBlocks.length * 0.06;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // 1. Keep/cut grid materializes first — this is the "triage decided" beat.
      tl.set(keepCutCards, { opacity: 0, y: 18, scale: 0.97 });
      tl.to(keepCutCards, { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.12 });

      // 2. Odds card punctuates the triage with a confident pop-in.
      if (oddsRef.current) {
        tl.fromTo(
          oddsRef.current,
          { opacity: 0, y: 14, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)" },
          "-=0.15"
        );
      }

      // 3. The spine line draws downward exactly as the blocks reveal —
      //    this is the "path being built" beat, not just a static rule.
      //    Same GSAP-drives-a-line pattern as driving a shader uniform:
      //    one timeline, one progress value, multiple things listening to it.
      if (spineLineRef.current && listHeight > 0) {
        tl.fromTo(
          spineLineRef.current,
          { strokeDashoffset: listHeight },
          { strokeDashoffset: 0, duration: blockStaggerDuration + 0.2, ease: "none" },
          "-=0.1"
        );
      }

      // 4. Rescue blocks assemble in sequence, racing alongside the spine draw.
      tl.set(rescueBlocks, { opacity: 0, x: -14 });
      tl.to(rescueBlocks, { opacity: 1, x: 0, duration: 0.4, stagger: 0.06 }, "<");

      // 5. Export panel, checklist, and AI coach settle in together after.
      tl.set(postPlanSections, { opacity: 0, y: 16 });
      tl.to(postPlanSections, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, "-=0.05");
    });

    return () => cancelAnimationFrame(raf);
  }, [survivalResult, rescueResult, goal]);

  const calcAvailable = typeof availableHours === "number" ? availableHours : 0;
  const calcRequired = typeof requiredHours === "number" ? requiredHours : 0;
  const localDeficit = calcRequired - calcAvailable;

  // ── PDF helpers ───────────────────────────────

  const processPdfFile = (file: File) => {
    if (file.size > MAX_PDF_BYTES) { setError(`PDF too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max 10MB.`); return; }
    setError(null); setPdfFile(file); setPdfBase64(null); setPdfReading(true);
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") setPdfBase64(reader.result); setPdfReading(false); };
    reader.onerror = () => { setError("Failed to read PDF."); setPdfReading(false); };
    reader.readAsDataURL(file);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; if (f.type !== "application/pdf") { setError("Only PDF files accepted."); return; } processPdfFile(f); };
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === "dragenter" || e.type === "dragover"); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (!f) return; if (f.type !== "application/pdf") { setError("Only PDF content accepted."); return; } processPdfFile(f); };
  const removeFile = () => { setPdfFile(null); setPdfBase64(null); setPdfReading(false); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    clearSession();
    setGoal(preset.goal); setAvailableHours(preset.availableHours); setRequiredHours(preset.requiredHours);
    setProgress(preset.progress); setFeaturesText(preset.features);
    setError(null); setIntelligence(null); setSurvivalResult(null); setTriageError(null);
    setRescueResult(null); setSimResult(null); setSimError(null);
  };

  // ── Agent 1: Diagnose ─────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) { setError("Please describe your goal first."); return; }
    if (availableHours === "" || availableHours < 0) { setError("Please enter positive hours remaining."); return; }
    if (requiredHours === "" || requiredHours < 0) { setError("Please specify estimated work remaining."); return; }
    if (pdfReading) { setError("Still reading PDF — wait a moment."); return; }

    setLoading(true); setError(null); setIntelligence(null);
    setSurvivalResult(null); setTriageError(null);
    setRescueResult(null); setSimResult(null); setSimError(null);
    setLoadingStepIdx(0);

    stepIntervalRef.current = setInterval(() => setLoadingStepIdx((p) => (p + 1) % LOADING_STEPS.length), 1200);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, availableHours, requiredHours, progress, featuresText, pdfData: pdfBase64 }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Server error ${res.status}`); }
      setIntelligence(await res.json());
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred while diagnosing your crisis.");
    } finally {
      setLoading(false); clearInterval(stepIntervalRef.current);
    }
  };

  // ── Agents 2+3: Triage + Plan (parallel) ──────

  const handleGenerateTriageAndPlan = async () => {
    if (!featuresText.trim()) { setTriageError("Please enter your feature list first."); return; }
    setTriageLoading(true); setTriageError(null); setSurvivalResult(null); setRescueResult(null);
    setSimResult(null); setSimError(null); setTriageLoadingStepIdx(0);

    const interval = setInterval(() => setTriageLoadingStepIdx((p) => (p + 1) % TRIAGE_LOADING_STEPS.length), 1200);
    try {
      const res = await fetch("/api/triage-and-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal, availableHours, requiredHours, progress,
          features: featuresText,
          intelligence,  // ← the backbone
          pdfData: pdfBase64,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Triage error ${res.status}`); }
      const { triage, plan } = await res.json();
      setSurvivalResult(triage);
      setRescueResult(plan);
    } catch (err: any) {
      setTriageError(err?.message || "Failed to generate triage + rescue plan.");
    } finally {
      setTriageLoading(false); clearInterval(interval);
    }
  };

  // ── Agent 4: Simulate ─────────────────────────

  const handleRunSimulation = async () => {
    if (!rescueResult) return;
    setSimLoading(true); setSimError(null); setSimResult(null); setSimLoadingStepIdx(0);
    const interval = setInterval(() => setSimLoadingStepIdx((p) => (p + 1) % SIMULATION_LOADING_STEPS.length), 1200);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal, availableHours, requiredHours, progress,
          intelligence,  // ← the backbone
          keep: survivalResult?.keep,
          success_chance_after: survivalResult?.success_chance_after,
          blocks: rescueResult.blocks,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Simulation error ${res.status}`); }
      setSimResult(await res.json());
    } catch (err: any) {
      setSimError(err?.message || "Failed to run simulation.");
    } finally {
      setSimLoading(false); clearInterval(interval);
    }
  };

  // ── Risk colours ──────────────────────────────

  const getRiskColors = (risk: string) => ({
    Critical: { textColor: "text-red-400", bgColor: "bg-red-950/60", borderColor: "border-red-500/50", accentColor: "bg-red-500" },
    High: { textColor: "text-amber-400", bgColor: "bg-amber-950/60", borderColor: "border-amber-500/50", accentColor: "bg-amber-500" },
    Moderate: { textColor: "text-yellow-400", bgColor: "bg-yellow-950/60", borderColor: "border-yellow-500/50", accentColor: "bg-yellow-500" },
    Low: { textColor: "text-emerald-400", bgColor: "bg-emerald-950/60", borderColor: "border-emerald-500/50", accentColor: "bg-emerald-500" },
  }[risk] || { textColor: "text-zinc-400", bgColor: "bg-zinc-950/60", borderColor: "border-zinc-500/50", accentColor: "bg-zinc-500" });

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-red-500 selection:text-white">
      <EmberEcho />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-red-900/8 rounded-full blur-[130px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-orange-950/8 rounded-full blur-[130px] pointer-events-none z-0" />

      <div className="relative z-10">

        {/* ── Header ── */}
        <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={onBack} className="text-[11px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1 flex-shrink-0">
                ← <span className="hidden sm:inline">Back</span>
              </button>
              {(intelligence || rescueResult) && (
                <>
                  <div className="w-px h-4 bg-zinc-800 flex-shrink-0" />
                  <button type="button"
                    onClick={() => { clearSession(); setIntelligence(null); setSurvivalResult(null); setRescueResult(null); setSimResult(null); setGoal(""); setFeaturesText(""); setProgress(0); setAvailableHours(initialHours ?? ""); setRequiredHours(""); }}
                    className="text-[11px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1 flex-shrink-0">
                    <RotateCcw className="w-3 h-3" /> <span className="hidden sm:inline">New</span>
                  </button>
                </>
              )}
              <div className="w-px h-4 bg-zinc-800 flex-shrink-0" />
              <div className="p-1.5 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg shadow-lg shadow-red-500/20 flex-shrink-0">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-red-400 via-orange-400 to-amber-200 bg-clip-text text-transparent flex-shrink-0">Phoenix</h1>
              <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded border border-red-500/30 bg-red-950/40 text-red-400 truncate">Crisis Recovery Agent</span>
            </div>
            {/* Google Sign-In / Firebase status */}
            <FirebaseAuthButton user={firebaseUser} loading={authLoading} />
            <div className="text-right flex-shrink-0">
              {deadlineCountdown ? (
                <div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping flex-shrink-0" />
                    <span className="text-[11px] font-mono font-bold text-red-400 tabular-nums">{deadlineCountdown}</span>
                  </div>
                  <div className="text-[9px] font-mono text-zinc-700 uppercase tracking-wider mt-0.5">until deadline</div>
                </div>
              ) : (
                <div>
                  <div className="text-[10px] text-zinc-600 font-mono">UTC {utcTime || "—"}</div>
                  <div className="text-[9px] text-zinc-700 font-mono">Gemini Tunnel Active</div>
                </div>
              )}
            </div>
          </div>
        </header>

        <AgentsShowcase />

        {/* ── Session Restore Banner ── */}
        <AnimatePresence>
          {showRestoreBanner && restoredSession && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="max-w-5xl mx-auto px-4 md:px-8 mb-2 mt-2">
              <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Save className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-blue-200">Session recovered · {getSessionAge(restoredSession)}</span>
                    <p className="text-[10px] text-blue-400/70 font-mono truncate">"{restoredSession.goal}"</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => {
                    const s = restoredSession;
                    setGoal(s.goal); setAvailableHours(s.availableHours); setRequiredHours(s.requiredHours);
                    setProgress(s.progress); setFeaturesText(s.featuresText);
                    if (s.result) setIntelligence(s.result as any);
                    if (s.survivalResult) setSurvivalResult(s.survivalResult);
                    if (s.rescueResult) setRescueResult(s.rescueResult);
                    if (s.simResult) setSimResult(s.simResult);
                    setShowRestoreBanner(false);
                  }} className="text-[11px] font-mono font-semibold text-blue-300 bg-blue-900/50 hover:bg-blue-800/60 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors">
                    Restore
                  </button>
                  <button type="button" onClick={() => { clearSession(); setShowRestoreBanner(false); }} className="text-[11px] font-mono text-blue-500/60 hover:text-blue-400 transition-colors px-2">Dismiss</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Divider ── */}
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex items-center gap-4 mb-12">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[11px] font-mono tracking-[0.2em] text-zinc-600 uppercase">Run Your Crisis Recovery</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 pb-10">

          {/* Presets */}
          <section className="mb-8">
            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono uppercase tracking-[0.2em] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" /><span>Pick your crisis type to prefill</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PRESETS.map((p, idx) => (
                <button key={idx} type="button" onClick={() => applyPreset(p)}
                  className={`text-left border p-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${(p as any).badge ? "bg-red-950/30 hover:bg-red-950/50 border-red-500/40 hover:border-red-400/60" : "bg-zinc-900/50 hover:bg-zinc-800/70 border-zinc-800 hover:border-zinc-700"}`}>
                  <div className={`absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${(p as any).badge ? "bg-gradient-to-r from-red-500/0 via-red-400 to-red-500/0" : "bg-gradient-to-r from-red-500/0 via-red-500/60 to-red-500/0"}`} />
                  {(p as any).badge && <span className="absolute top-2 right-2 text-[8px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400 uppercase tracking-wider">You're here</span>}
                  <h3 className={`text-[10px] font-mono mb-1 transition-colors uppercase tracking-wider ${(p as any).badge ? "text-red-400 group-hover:text-red-300" : "text-zinc-600 group-hover:text-orange-400"}`}>{p.title}</h3>
                  <p className="text-sm font-medium text-zinc-300 line-clamp-1">{p.goal}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-600 font-mono">
                    <span>{p.availableHours}h left</span><span className="text-zinc-800">·</span><span>{p.progress}% done</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Form + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Main Form */}
            <main className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bg-gradient-to-r from-red-500 to-orange-500 h-0.5 w-[120px]" />
              <h2 className="text-base font-semibold font-mono mb-5 text-zinc-200 tracking-tight">Crisis Inputs</h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-1.5">Goal / Output Expected</label>
                  <div className="relative">
                    <input type="text" required maxLength={140} value={goal} onChange={(e) => setGoal(e.target.value)}
                      placeholder="e.g. Pass tomorrow's exam, submit project, prep for interview"
                      className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-red-500/60 rounded-lg py-2.5 pl-3 pr-24 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]" />
                    <div className="absolute right-12 top-1.5">
                      <VoiceInput mode="goal" onResult={(t) => setGoal(t)} disabled={loading} />
                    </div>
                    <div className="absolute right-3 top-2.5 text-zinc-700 text-[10px] font-mono">{goal.length}/140</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /><span>Hours remaining</span>
                    </label>
                    <input type="number" min="1" max="1000" required value={availableHours}
                      onChange={(e) => setAvailableHours(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Hours left until deadline"
                      className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-red-500/60 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-1.5 flex items-center gap-1">
                      <Hourglass className="w-3.5 h-3.5" /><span>Hours of work left</span>
                    </label>
                    <input type="number" min="1" max="1000" required value={requiredHours}
                      onChange={(e) => setRequiredHours(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Estimated hours required"
                      className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-red-500/60 rounded-lg py-2.5 px-3 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors" />
                  </div>
                </div>

                <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/40 transition-colors duration-500" style={{ borderColor: progress > 0 ? `rgba(249,115,22,${0.08 + (progress / 100) * 0.25})` : undefined }}>
                  <div className="flex justify-between items-center mb-2.5">
                    <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500">% complete so far</label>
                    <motion.span key={progress} initial={{ scale: 1.25 }} animate={{ scale: 1 }} transition={{ duration: 0.2, ease: "easeOut" }}
                      className="text-sm font-mono font-bold text-orange-400 inline-block">{progress}%</motion.span>
                  </div>
                  <input type="range" min="0" max="100" step="1" value={progress} onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-red-500 focus:outline-none transition-[background] duration-150"
                    style={{ background: `linear-gradient(to right, #f97316 0%, #ef4444 ${progress}%, #27272a ${progress}%, #27272a 100%)` }} />
                  <div className="flex justify-between text-[9px] text-zinc-700 mt-1.5 font-mono">
                    <span>JUST STARTING</span><span>HALF WAY</span><span>ALMOST DONE</span>
                  </div>
                </div>

                {/* PDF upload */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-1.5">
                    Upload problem statement / spec (PDF, optional)
                  </label>
                  <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 transition-all duration-200 text-center cursor-pointer ${pdfFile ? "border-emerald-500/40 bg-emerald-950/10" : dragActive ? "border-red-500 bg-red-950/15" : "border-zinc-800/80 hover:border-zinc-700 bg-zinc-950/30"}`}>
                    <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                    {pdfFile ? (
                      <div className="flex items-center justify-between bg-zinc-900/80 p-2.5 rounded border border-zinc-800/60" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 text-left min-w-0">
                          <div className="flex-shrink-0 p-1.5 bg-red-950/60 text-red-400 rounded">
                            {pdfReading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-zinc-300 truncate">{pdfFile.name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">{pdfReading ? "Reading file…" : `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB · ready`}</p>
                          </div>
                        </div>
                        <button type="button" onClick={removeFile} className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-2">
                        <Upload className={`w-7 h-7 mb-2 transition-colors ${dragActive ? "text-red-400" : "text-zinc-600"}`} />
                        <p className="text-xs text-zinc-500">Drop PDF here, or <span className="text-red-400 font-semibold">browse</span></p>
                        <p className="text-[10px] text-zinc-700 mt-1 font-mono">PDF only · up to 10MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Feature list — shown after Agent 1 runs */}
                <AnimatePresence>
                  {intelligence && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="border-t border-zinc-800/65 pt-5 mt-5 text-left">
                      <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-orange-400 mb-1.5 flex items-center gap-1.5">
                        <Zap className="w-4 h-4" /><span>List what you need to cover / complete (one per line)</span>
                        <div className="ml-auto">
                          <VoiceInput
                            mode="features"
                            onResult={(t) => setFeaturesText((prev) => prev ? prev + "\n" + t : t)}
                            disabled={loading}
                          />
                        </div>
                      </label>
                      <textarea rows={5} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)}
                        placeholder={"Arrays & Trees\nDynamic Programming\nMock Interview\nCompany Research"}
                        className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-orange-500/60 rounded-xl py-2.5 px-3 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors font-mono leading-relaxed" />
                      <p className="text-[10px] text-zinc-600 mt-1.5">Agents 2 + 3 will triage this into what you can realistically cover and map out your hour-by-hour plan.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit" disabled={loading || pdfReading}
                  className="w-full relative group overflow-hidden bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg active:scale-[0.98] transition-all duration-150 text-sm disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
                  {loading ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /><span className="font-mono tracking-wide text-xs">{LOADING_STEPS[loadingStepIdx]}</span></>
                  ) : (
                    <><Flame className="w-4 h-4 group-hover:scale-125 transition-transform" /><span>Diagnose My Crisis</span><ChevronRight className="w-4 h-4" /></>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                </button>
                <AnimatePresence>
                  {loading && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden">
                      <div className="mt-3 bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-4 flex items-center gap-4">
                        <DiagnoseLoader />
                        <div className="text-left">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Scoring risk dimensions</div>
                          <div className="text-[10px] font-mono text-zinc-600 mt-0.5">Time · Scope · Complexity · Dependency · Execution</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </main>

            {/* Sidebar */}
            <aside className="lg:col-span-5 space-y-4">
              <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
                <h3 className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-4 flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                  <Compass className="w-4 h-4 text-orange-400" /><span>Deterministic Deficit Calculator</span>
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-900/60 text-center">
                      <span className="block text-[9px] font-mono text-zinc-600 uppercase tracking-wider mb-1">Available</span>
                      <span className="text-xl font-bold text-zinc-200">{availableHours !== "" ? `${availableHours}h` : "--"}</span>
                    </div>
                    <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-900/60 text-center">
                      <span className="block text-[9px] font-mono text-zinc-600 uppercase tracking-wider mb-1">Required</span>
                      <span className="text-xl font-bold text-zinc-200">{requiredHours !== "" ? `${requiredHours}h` : "--"}</span>
                    </div>
                  </div>
                  <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl text-left">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Deficit Outcome</span>
                      <span className="text-[9px] font-mono bg-zinc-900 text-zinc-600 px-1.5 py-0.5 rounded">JS Computed</span>
                    </div>
                    {availableHours === "" || requiredHours === "" ? (
                      <div className="text-sm text-zinc-600 italic py-2">Enter metrics to compute deficit.</div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-4xl font-extrabold leading-none tracking-tight ${localDeficit > 0 ? "text-red-500" : "text-emerald-500"}`}>{localDeficit > 0 ? `+${localDeficit}` : localDeficit}</span>
                          <span className="text-sm text-zinc-500 font-mono">hours</span>
                        </div>
                        {localDeficit > 0 ? (
                          <div className="mt-3 flex items-start gap-2 text-xs text-red-400/90 bg-red-950/20 border border-red-500/20 p-2.5 rounded-lg">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
                            <div><p className="font-semibold">Severe hour deficit</p><p className="text-zinc-500 text-[11px] mt-0.5">Short by {localDeficit}h — scope cutting required.</p></div>
                          </div>
                        ) : (
                          <div className="mt-3 flex items-start gap-2 text-xs text-emerald-400/90 bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-lg">
                            <Zap className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                            <div><p className="font-semibold">Mathematically feasible</p><p className="text-zinc-500 text-[11px] mt-0.5">Surplus of {Math.abs(localDeficit)}h. Stay focused.</p></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900/10 border border-zinc-900 p-4 rounded-2xl flex items-start gap-2.5 text-left">
                <Info className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-zinc-600 leading-normal">
                  <span className="font-semibold text-zinc-500">How it works:</span> Agent 1 reads your goal and any attached PDF to build a deep situation report. Agents 2 + 3 fire together — triaging what to focus on and mapping your hour-by-hour plan. Agent 4 simulates both futures side by side.
                </div>
              </div>
            </aside>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="mt-6 bg-red-950/80 border border-red-500/40 text-red-200 p-4 rounded-xl flex items-start gap-3 shadow-xl text-left">
                <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-grow min-w-0">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold mb-1">System Exception Raised</h4>
                  <p className="text-sm text-red-300 break-words">{error}</p>
                </div>
                <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-100 transition-colors flex-shrink-0"><X className="w-4 h-4" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ RESULTS ═══ */}
          <AnimatePresence>
            {intelligence && (
              <motion.section ref={resultsSectionRef} initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className="mt-10 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden text-left">
                <div className={`absolute top-0 bottom-0 left-0 w-1.5 rounded-l-2xl ${getRiskColors(intelligence.risk_level).accentColor}`} />
                <CrisisSpine ref={crisisSpineRef} height={crisisSpineHeight} />

                {/* Agent 1 header */}
                <div ref={agent1RefPoint} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-5 pl-2">
                  <div>
                    <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider mb-1">Agent 01 — Crisis Intelligence Report</div>
                    <h3 className="text-lg sm:text-xl font-bold text-zinc-100 break-words line-clamp-2">"{goal}"</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-bold uppercase tracking-wider ${getRiskColors(intelligence.risk_level).bgColor} ${getRiskColors(intelligence.risk_level).borderColor} ${getRiskColors(intelligence.risk_level).textColor}`}>
                      <span className={`w-2 h-2 rounded-full ${getRiskColors(intelligence.risk_level).accentColor} animate-pulse`} />
                      {intelligence.risk_level} Risk
                    </div>
                  </div>
                </div>

                {intelligence.note && (
                  <div className="flex items-start gap-2.5 bg-amber-950/25 border border-amber-500/20 text-amber-400 p-3.5 rounded-xl text-xs font-mono mb-6 ml-2">
                    <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div><span className="font-bold uppercase tracking-wider block mb-0.5">⚡ Heuristic Recovery Active</span><span>{intelligence.note}</span></div>
                  </div>
                )}

                {/* Metric cards */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 pl-2">
                  {[
                    { label: "Available hours", value: intelligence.availableHours, unit: "h", color: "text-zinc-100" },
                    { label: "Required estimate", value: intelligence.requiredHours, unit: "h", color: "text-zinc-100" },
                    { label: "Work hour gap", value: intelligence.deficit > 0 ? `+${intelligence.deficit}` : intelligence.deficit, unit: "h", color: intelligence.deficit > 0 ? "text-red-500" : "text-emerald-500" },
                  ].map((m, i) => (
                    <div key={i} className="bg-zinc-950/55 border border-zinc-800/40 p-3 sm:p-4 rounded-xl">
                      <span className="block text-[9px] font-mono text-zinc-600 uppercase tracking-wider mb-1">{m.label}</span>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-xl sm:text-3xl font-extrabold ${m.color}`}>{m.value}</span>
                        <span className="text-xs font-mono text-zinc-500">{m.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Failure causes */}
                <div className="bg-zinc-950/60 p-5 rounded-xl border border-zinc-800/60 pl-6 relative mb-4 ml-2">
                  <div className="absolute top-0 bottom-0 left-0 bg-orange-500/20 w-1 rounded-l" />
                  <h4 className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold mb-3">Most Likely Failure Causes</h4>
                  <ul className="space-y-3">
                    {intelligence.failure_causes.map((cause, idx) => (
                      <motion.li key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                        className="text-sm text-zinc-300 leading-relaxed flex items-start gap-2.5">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" /><span>{cause}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Deep intelligence panel */}
                <div className="pl-2">
                  <IntelligencePanel intel={intelligence} />
                </div>

                {/* ─── Agent 2+3 trigger ─────────────────── */}
                <div className="border-t border-zinc-800/60 pt-6 mt-6 pl-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-orange-950 rounded-lg"><Sparkles className="w-4 h-4 text-orange-400" /></div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100">Triage + Rescue Plan</h4>
                      <p className="text-[11px] text-zinc-600">Agents 02 + 03 run together — feature triage then hour-by-hour schedule in one call.</p>
                    </div>
                  </div>
                  {!survivalResult && !triageLoading && (
                    <button type="button" onClick={handleGenerateTriageAndPlan}
                      className="w-full bg-zinc-800 hover:bg-zinc-700/90 border border-zinc-700 text-zinc-100 font-semibold py-3 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 active:scale-[0.99]">
                      <Zap className="w-4 h-4 text-amber-400" /><span>Generate Triage + Rescue Plan</span>
                    </button>
                  )}
                  {triageLoading && (
                    <div className="w-full bg-zinc-950/60 border border-zinc-800 p-4 rounded-xl flex items-center justify-center gap-4">
                      <TriageLoader />
                      <span className="text-xs font-mono text-zinc-400">{TRIAGE_LOADING_STEPS[triageLoadingStepIdx]}</span>
                    </div>
                  )}
                  {triageError && (
                    <div className="mt-3 bg-red-950/40 border border-red-500/20 text-red-200 p-3 rounded-xl flex items-center gap-2.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" /><span>{triageError}</span>
                    </div>
                  )}
                </div>

                {/* ─── Agent 2+3 results ─────────────────── */}
                <AnimatePresence>
                  {survivalResult && rescueResult && (
                    <motion.div
                      ref={(el) => { planRevealRef.current = el; agent2RefPoint.current = el; }}
                      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="border-t border-zinc-800/60 pt-5 sm:pt-6 mt-5 sm:mt-6 pl-1 sm:pl-2 space-y-5 sm:space-y-6">

                      {/* Triage header */}
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-400" />
                        <h4 className="text-base font-bold text-zinc-100">Emergency Survival Architecture</h4>
                      </div>

                      {survivalResult.note && (
                        <div className="flex items-start gap-2.5 bg-amber-950/25 border border-amber-500/20 text-amber-400 p-3.5 rounded-xl text-xs font-mono">
                          <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div><span className="font-bold block mb-0.5">⚡ Heuristic Recovery Active</span><span>{survivalResult.note}</span></div>
                        </div>
                      )}

                      {/* Keep / Cut */}
                      <div ref={keepCutRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div data-reveal-card className="bg-zinc-950/40 border border-emerald-500/20 p-4 rounded-xl relative overflow-hidden">
                          <div className="absolute top-0 bottom-0 left-0 bg-emerald-500 w-1" />
                          <h5 className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold mb-3 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />Keep — Core Deliverables
                          </h5>
                          <ul className="space-y-3">
                            {survivalResult.keep.map((f, i) => (
                              <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                                <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                                <div>
                                  <div className="font-medium">{typeof f === "string" ? f : f.feature}</div>
                                  {typeof f !== "string" && f.reason && <p className="text-zinc-500 mt-0.5 leading-relaxed">{f.reason}</p>}
                                  {typeof f !== "string" && f.shortcut && (
                                    <p className="text-blue-400/80 mt-1 font-mono text-[10px] bg-blue-950/20 border border-blue-500/15 rounded px-2 py-1">
                                      → {f.shortcut}
                                    </p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div data-reveal-card className="bg-zinc-950/40 border border-red-500/20 p-4 rounded-xl relative overflow-hidden">
                          <div className="absolute top-0 bottom-0 left-0 bg-red-500 w-1" />
                          <h5 className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold mb-3">Cut / Defer to v2</h5>
                          <ul className="space-y-3">
                            {survivalResult.cut.map((f, i) => (
                              <li key={i} className="text-xs text-zinc-400/80 flex items-start gap-2">
                                <span className="text-red-500/80 font-bold mt-0.5">✕</span>
                                <div>
                                  <div className="line-through decoration-red-500/40">{typeof f === "string" ? f : f.feature}</div>
                                  {typeof f !== "string" && f.reason && <p className="text-zinc-600 mt-0.5 no-underline">{f.reason}</p>}
                                  {typeof f !== "string" && (f as any).fake_strategy && (
                                    <p className="text-zinc-500 mt-1 font-mono text-[10px] bg-zinc-900/60 border border-zinc-800 rounded px-2 py-1 no-underline">
                                      Fake it: {(f as any).fake_strategy}
                                    </p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div ref={oddsRef} className="relative">
                        <div
                          ref={lockInPulseRef}
                          className="pointer-events-none absolute inset-0 m-auto w-32 h-32 rounded-full bg-emerald-400/30 blur-2xl"
                          style={{ opacity: 0 }}
                          aria-hidden
                        />
                        <AnimatedChance
                          before={survivalResult.success_chance_before}
                          after={survivalResult.success_chance_after}
                          onLockIn={handleOddsLockIn}
                        />
                      </div>

                      {/* Rescue Plan */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />Hour-by-Hour Execution Timeline
                          </h5>
                          <span className="text-[10px] font-mono text-zinc-500">Total: <strong className="text-zinc-300">{rescueResult.total_hours_planned}h</strong></span>
                        </div>

                        {rescueResult.note && (
                          <div className="flex items-start gap-2.5 bg-amber-950/25 border border-amber-500/20 text-amber-400 p-3.5 rounded-xl text-xs font-mono mb-4">
                            <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <div><span className="font-bold block mb-0.5">⚡ Heuristic Recovery Active</span><span>{rescueResult.note}</span></div>
                          </div>
                        )}

                        <div ref={rescueListRef} className="relative pl-4 space-y-3">
                          {spineHeight > 0 && (
                            <svg
                              className="absolute left-0 top-0 pointer-events-none"
                              width="2" height={spineHeight} viewBox={`0 0 2 ${spineHeight}`}
                              aria-hidden
                            >
                              {/* Faint track underneath so the draw-in has something to grow against */}
                              <line x1="1" y1="0" x2="1" y2={spineHeight} stroke="currentColor" strokeWidth="2" className="text-zinc-800" />
                              <line
                                ref={spineLineRef}
                                x1="1" y1="0" x2="1" y2={spineHeight}
                                stroke="currentColor" strokeWidth="2" className="text-orange-500/70"
                                strokeDasharray={spineHeight}
                                strokeDashoffset={spineHeight}
                              />
                            </svg>
                          )}
                          {rescueResult.blocks.map((block, idx) => {
                            const typeMap: Record<string, { border: string; badge: string; Icon: any }> = {
                              build: { border: "border-l-blue-500", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", Icon: Wrench },
                              test: { border: "border-l-yellow-500", badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", Icon: CheckSquare },
                              deploy: { border: "border-l-green-500", badge: "bg-green-500/10 text-green-400 border-green-500/20", Icon: Rocket },
                              pitch: { border: "border-l-orange-500", badge: "bg-orange-500/10 text-orange-400 border-orange-500/20", Icon: Presentation },
                              debug: { border: "border-l-red-500", badge: "bg-red-500/10 text-red-400 border-red-500/20", Icon: Wrench },
                              write: { border: "border-l-blue-500", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", Icon: FileText },
                              review: { border: "border-l-purple-500", badge: "bg-purple-500/10 text-purple-400 border-purple-500/20", Icon: CheckSquare },
                              format: { border: "border-l-zinc-500", badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", Icon: FileText },
                              submit: { border: "border-l-emerald-500", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", Icon: Rocket },
                              analyze: { border: "border-l-blue-500", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", Icon: Cpu },
                              synthesize: { border: "border-l-violet-500", badge: "bg-violet-500/10 text-violet-400 border-violet-500/20", Icon: Layers },
                              cite: { border: "border-l-zinc-500", badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", Icon: BookOpen },
                              draft: { border: "border-l-blue-500", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", Icon: FileText },
                              design: { border: "border-l-pink-500", badge: "bg-pink-500/10 text-pink-400 border-pink-500/20", Icon: Sparkles },
                              rehearse: { border: "border-l-orange-500", badge: "bg-orange-500/10 text-orange-400 border-orange-500/20", Icon: Presentation },
                              record: { border: "border-l-red-500", badge: "bg-red-500/10 text-red-400 border-red-500/20", Icon: Rocket },
                              finalize: { border: "border-l-emerald-500", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", Icon: CheckSquare },
                            };
                            const t = typeMap[block.type] || typeMap.build;
                            const isCritical = block.risk_tag === "critical_path";
                            const isHighRisk = block.risk_tag === "high_risk";
                            return (
                              <div key={idx} data-reveal-block
                                className={`relative bg-zinc-950/40 border border-zinc-900/60 p-4 rounded-xl border-l-4 ${t.border} ${isCritical ? "ring-1 ring-yellow-500/30" : ""}`}>
                                <div className="absolute -left-[21px] top-4 w-2.5 h-2.5 rounded-full bg-zinc-900 border-2 border-zinc-700" />
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="text-[10px] font-mono font-bold text-zinc-500">{block.hour_range}</span>
                                  <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${t.badge} flex items-center gap-1`}>
                                    <t.Icon className="w-3 h-3" /><span>{block.type}</span>
                                  </span>
                                  {isCritical && <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-yellow-500/30 bg-yellow-950/30 text-yellow-400">⭐ Critical Path</span>}
                                  {isHighRisk && <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-red-500/20 bg-red-950/20 text-red-400">⚠ High Risk</span>}
                                </div>
                                <p className="text-xs text-zinc-300 leading-relaxed">{block.task}</p>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-3 bg-zinc-950/60 border border-zinc-900 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] text-zinc-500 font-mono">Allocation Efficiency</span>
                          {rescueResult.buffer_hours > 0 ? (
                            <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                              {rescueResult.buffer_hours}h buffer — use for testing
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-semibold text-amber-400 bg-amber-950/40 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                              No buffer — execute exactly as planned
                            </span>
                          )}
                        </div>
                      </div>

                      <div ref={postPlanRef} className="space-y-5 sm:space-y-6">
                        <div data-reveal-section>
                          <ExportPanel
                            goal={goal} availableHours={availableHours}
                            riskLevel={intelligence?.risk_level || "High"}
                            keepFeatures={survivalResult.keep.map((k) => typeof k === "string" ? k : k.feature)}
                            cutFeatures={survivalResult.cut.map((k) => typeof k === "string" ? k : k.feature)}
                            successChanceBefore={survivalResult.success_chance_before}
                            successChanceAfter={survivalResult.success_chance_after}
                            rescueBlocks={rescueResult.blocks}
                            bufferHours={rescueResult.buffer_hours}
                          />
                        </div>

                        <div data-reveal-section>
                          <ChecklistTracker
                            blocks={rescueResult.blocks}
                            goal={goal}
                            sessionKey={goal.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}
                          />
                        </div>

                        <div data-reveal-section>
                          <AIMotivator
                            goal={goal}
                            riskLevel={intelligence?.risk_level || "High"}
                            availableHours={availableHours}
                            successChanceAfter={survivalResult.success_chance_after}
                            doneCount={0}
                            totalBlocks={rescueResult.blocks.length}
                          />
                        </div>

                        <div data-reveal-section>
                          <CalendarSync
                            goal={goal}
                            riskLevel={intelligence?.risk_level || "High"}
                            keepFeatures={survivalResult.keep.map((k) => typeof k === "string" ? k : k.feature)}
                            successChanceBefore={survivalResult.success_chance_before}
                            successChanceAfter={survivalResult.success_chance_after}
                            rescueBlocks={rescueResult.blocks}
                          />
                        </div>

                        <div data-reveal-section>
                          <TeamNotify
                            goal={goal}
                            riskLevel={intelligence?.risk_level || "High"}
                            availableHours={availableHours}
                            keepFeatures={survivalResult.keep.map((k) => typeof k === "string" ? k : k.feature)}
                            cutFeatures={survivalResult.cut.map((k) => typeof k === "string" ? k : k.feature)}
                            successChanceBefore={survivalResult.success_chance_before}
                            successChanceAfter={survivalResult.success_chance_after}
                            rescueBlocks={rescueResult.blocks}
                            bufferHours={rescueResult.buffer_hours}
                          />
                        </div>
                      </div>

                      {/* ─── Agent 4 trigger ─── */}
                      <div ref={agent4RefPoint} className="border-t border-zinc-800/60 pt-6 mt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-1.5 bg-violet-950 rounded-lg"><GitBranch className="w-4 h-4 text-violet-400" /></div>
                          <div>
                            <h4 className="text-sm font-semibold text-zinc-100">Simulation Engine</h4>
                            <p className="text-[11px] text-zinc-600">Agent 04 — simulates your original plan vs Phoenix plan side by side.</p>
                          </div>
                        </div>
                        {!simResult && !simLoading && (
                          <button type="button" onClick={handleRunSimulation}
                            className="w-full bg-zinc-800 hover:bg-zinc-700/90 border border-zinc-700 text-zinc-100 font-semibold py-3 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 active:scale-[0.99]">
                            <GitBranch className="w-4 h-4 text-violet-400" /><span>Run Simulation</span>
                          </button>
                        )}
                        {simLoading && (
                          <div className="w-full bg-zinc-950/60 border border-zinc-800 p-4 rounded-xl flex items-center justify-center gap-4">
                            <SimulateLoader />
                            <span className="text-xs font-mono text-zinc-400">{SIMULATION_LOADING_STEPS[simLoadingStepIdx]}</span>
                          </div>
                        )}
                        {simError && (
                          <div className="mt-3 bg-red-950/40 border border-red-500/20 text-red-200 p-3 rounded-xl flex items-center gap-2.5 text-xs">
                            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" /><span>{simError}</span>
                          </div>
                        )}
                        <AnimatePresence>
                          {simResult && (
                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                              <SimulationEngine data={simResult} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.section>
            )}
          </AnimatePresence>

        </div>

        <footer className="text-center text-[10px] text-zinc-700 font-mono tracking-wide py-10 border-t border-zinc-900">
          Phoenix — Last Minute Life Saver · 6 AI Agents · Gemini Powered · Any deadline. Any crisis. Right now.
        </footer>
      </div>
    </div>
  );
}