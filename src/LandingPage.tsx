import React, { useRef, useLayoutEffect, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flame } from "lucide-react";
import { motion } from "motion/react";
import { EmberField } from "./EmberField";

gsap.registerPlugin(ScrollTrigger);

interface LandingPageProps {
  onEnter: (deadlineHours?: number) => void;
}

// ── Agent cards — updated previews for universal scenarios ──
const CARDS = [
  {
    num: "01",
    label: "Crisis Assessment",
    preview: ["CRITICAL — 9h deficit", "→ 4 chapters untouched", "→ Weak areas identified", "→ Demo strategy locked"],
    border: "border-red-500/40",
    bg: "bg-red-950/25",
    glow: "shadow-red-500/10",
    accent: "text-red-400",
    dot: "bg-red-500",
    pos: "w-[220px] top-[7%] left-[3%]",
    rotate: -9,
  },
  {
    num: "02",
    label: "Survival Version",
    preview: ["✓ Core topics", "✓ High-yield sections", "✕ Extended proofs (skip)", "✕ Optional reading", "20% → 80% odds"],
    border: "border-orange-500/40",
    bg: "bg-orange-950/25",
    glow: "shadow-orange-500/10",
    accent: "text-orange-400",
    dot: "bg-orange-500",
    pos: "w-[210px] top-[5%] right-[3%]",
    rotate: 8,
  },
  {
    num: "03",
    label: "Rescue Planner",
    preview: ["H0–2: High-yield review", "H2–4: Practice problems", "H4–5: Weak spots", "H5–6: Final read-through"],
    border: "border-blue-500/40",
    bg: "bg-blue-950/25",
    glow: "shadow-blue-500/10",
    accent: "text-blue-400",
    dot: "bg-blue-500",
    pos: "w-[210px] bottom-[14%] left-[2%]",
    rotate: 6,
  },
  {
    num: "04",
    label: "Simulation Engine",
    preview: ["Timeline A: ✕ Failed", "→ Ran out of time", "Timeline B: ✓ Passed", "→ Phoenix plan executed"],
    border: "border-violet-500/40",
    bg: "bg-violet-950/25",
    glow: "shadow-violet-500/10",
    accent: "text-violet-400",
    dot: "bg-violet-500",
    pos: "w-[210px] bottom-[12%] right-[2%]",
    rotate: -7,
  },
];

const MARQUEE_ITEMS = [
  "CRISIS ASSESSMENT", "·", "SCOPE TRIAGE", "·",
  "RESCUE PLANNING", "·", "OUTCOME SIMULATION", "·",
  "EXAMS · PROJECTS · INTERVIEWS · DEADLINES", "·", "GEMINI POWERED", "·",
  "LAST MINUTE LIFE SAVER", "·", "ANY HIGH-STAKES SITUATION", "·",
  "RESCUE PLANNING", "·", "OUTCOME SIMULATION", "·",
  "BUILT FOR REAL PEOPLE", "·", "GEMINI POWERED", "·",
];

// Rotating situation lines shown in the headline
const SITUATIONS = [
  { line1: "Your exam is", line2: "in", suffix: "hours." },
  { line1: "Your deadline is", line2: "in", suffix: "hours." },
  { line1: "Your interview is", line2: "in", suffix: "hours." },
  { line1: "Your submission is", line2: "in", suffix: "hours." },
  { line1: "Your presentation is", line2: "in", suffix: "hours." },
];

export default function LandingPage({ onEnter }: LandingPageProps) {
  const [deadlineHours, setDeadlineHours] = useState(6);
  const [situationIdx, setSituationIdx] = useState(0);

  const sectionRef      = useRef<HTMLDivElement>(null);
  const wrapperRefs     = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs       = useRef<(HTMLDivElement | null)[]>([]);
  const headlineRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const subtitleRef     = useRef<HTMLDivElement>(null);
  const ctaRef          = useRef<HTMLButtonElement>(null);
  const navRef          = useRef<HTMLDivElement>(null);
  const eyebrowRef      = useRef<HTMLDivElement>(null);
  const marqueeRef      = useRef<HTMLDivElement>(null);
  const marqueeTrackRef = useRef<HTMLDivElement>(null);
  const pillsRef        = useRef<HTMLDivElement>(null);

  // ── Ember field (Three.js) — fully isolated from React renders ──
  const emberContainerRef = useRef<HTMLDivElement>(null);
  const emberFieldRef      = useRef<EmberField | null>(null);
  // Mirror deadlineHours into a ref so the ember RAF loop can read the
  // latest value without this effect ever re-running on every keystroke.
  const deadlineHoursRef   = useRef(deadlineHours);
  deadlineHoursRef.current = deadlineHours;

  useEffect(() => {
    const container = emberContainerRef.current;
    if (!container) return;

    const field = new EmberField(container, { particleCount: 220 });
    emberFieldRef.current = field;

    // Urgency ticks on an interval (not on React state) — reads the ref,
    // so changing deadlineHours never tears down/rebuilds the WebGL scene.
    const urgencyInterval = setInterval(() => {
      const hours = deadlineHoursRef.current;
      // Maps 72h (calm) → 1h (critical) onto a 0→1 urgency curve.
      const urgency = 1 - Math.min(1, Math.max(0, (hours - 1) / 71));
      field.setUrgency(urgency);
    }, 200);

    // Mouse parallax — normalized -1..1, smoothed inside EmberField itself.
    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      field.setMouse(nx, -ny);
    };
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      clearInterval(urgencyInterval);
      window.removeEventListener("mousemove", handleMouseMove);
      field.destroy();
      emberFieldRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rotate the situation every 2.5 seconds
  React.useEffect(() => {
    const t = setInterval(() => setSituationIdx((p) => (p + 1) % SITUATIONS.length), 2500);
    return () => clearInterval(t);
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const initials = CARDS.map(() => ({
      rotation: Math.round(Math.random() * 50 - 25),
      scale: 1.45,
    }));

    const ctx = gsap.context(() => {
      gsap.from(navRef.current, { y: -20, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.05 });
      gsap.from(eyebrowRef.current, { y: 12, opacity: 0, duration: 0.6, ease: "power3.out", delay: 0.25 });

      headlineRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.from(el, { y: "108%", opacity: 0, duration: 1.0, ease: "power4.out", delay: 0.35 + i * 0.12 });
      });

      gsap.from(subtitleRef.current, { y: 22, opacity: 0, duration: 0.75, ease: "power3.out", delay: 0.9 });
      gsap.from(ctaRef.current, { scale: 0.86, opacity: 0, duration: 0.65, ease: "back.out(1.7)", delay: 1.08 });
      gsap.from(pillsRef.current, { y: 10, opacity: 0, duration: 0.5, ease: "power2.out", delay: 1.22 });
      gsap.from(marqueeRef.current, { opacity: 0, duration: 0.6, delay: 1.35 });

      if (marqueeTrackRef.current) {
        gsap.to(marqueeTrackRef.current, { x: "-50%", duration: 24, ease: "none", repeat: -1 });
      }

      innerRefs.current.forEach((inner, idx) => {
        const wrapper = wrapperRefs.current[idx];
        if (!inner || !wrapper) return;
        const measureOffset = () => {
          const wRect = wrapper.getBoundingClientRect();
          const sRect = section.getBoundingClientRect();
          return { x: sRect.left + sRect.width / 2 - (wRect.left + wRect.width / 2), y: sRect.top + sRect.height / 2 - (wRect.top + wRect.height / 2) };
        };
        gsap.fromTo(inner,
          { x: () => measureOffset().x, y: () => measureOffset().y, scale: initials[idx].scale, rotate: initials[idx].rotation, opacity: 0 },
          { x: 0, y: 0, scale: 1, rotate: CARDS[idx].rotate, opacity: 1, duration: 1.3, ease: "back.inOut(1.6)", delay: 0.4 + idx * 0.07 }
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  const sit = SITUATIONS[situationIdx];

  return (
    <div ref={sectionRef} className="relative min-h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden flex flex-col select-none">

      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-[20%] -left-[10%] w-[700px] h-[700px] bg-red-900/7 rounded-full blur-[180px]" />
        <div className="absolute -bottom-[15%] -right-[10%] w-[600px] h-[600px] bg-orange-900/6 rounded-full blur-[160px]" />
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-violet-900/4 rounded-full blur-[120px]" />
      </div>

      {/* Ember field — Three.js canvas, isolated from React state, sits
          behind all content. pointer-events-none keeps it purely ambient. */}
      <div
        ref={emberContainerRef}
        className="pointer-events-none absolute inset-0 z-[1] opacity-90"
        aria-hidden
      />

      {/* ── Nav ── */}
      <div ref={navRef} className="relative z-30 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg shadow-lg shadow-red-500/25">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold bg-gradient-to-r from-red-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">Phoenix</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-zinc-600 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            CRISIS RECOVERY ACTIVE
          </span>
          <button onClick={() => onEnter(deadlineHours)}
            className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-full transition-colors">
            Launch App →
          </button>
        </div>
      </div>

      {/* ── Desktop floating cards (hidden on mobile) ── */}
      {CARDS.map((card, idx) => (
        <div key={card.num} ref={(el) => { wrapperRefs.current[idx] = el; }}
          className={`absolute ${card.pos} z-10 hidden lg:block`}>
          <div ref={(el) => { innerRefs.current[idx] = el; }}
            className={`rounded-2xl border ${card.border} ${card.bg} p-4 shadow-xl ${card.glow} backdrop-blur-sm will-change-transform`}
            style={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className={`w-1.5 h-1.5 rounded-full ${card.dot}`} />
              <span className={`text-[10px] font-mono tracking-[0.2em] ${card.accent} uppercase`}>{card.num}</span>
            </div>
            <div className="text-xs font-bold text-zinc-100 mb-2 leading-snug font-mono">{card.label}</div>
            <div className="space-y-1">
              {card.preview.map((line, i) => (
                <div key={i} className={`text-[10px] font-mono ${
                  line.startsWith("✕") || line.startsWith("Timeline A") ? "text-red-400/70"
                  : line.startsWith("✓") || line.startsWith("Timeline B") ? "text-emerald-400/80"
                  : line.startsWith("→") ? "text-zinc-500"
                  : "text-zinc-400"
                }`}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* ── Hero center ── */}
      <div className="relative z-20 flex flex-col items-center justify-center flex-1 px-6 text-center pt-2 pb-1">

        {/* Eyebrow */}
        <div ref={eyebrowRef} className="flex items-center gap-2 mb-5 sm:mb-8">
          <div className="w-6 sm:w-10 h-[1px] bg-gradient-to-r from-transparent to-red-500/60 flex-shrink-0" />
          <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.2em] sm:tracking-[0.28em] text-red-400 uppercase text-center">
            Last Minute Life Saver
          </span>
          <div className="w-6 sm:w-10 h-[1px] bg-gradient-to-l from-transparent to-red-500/60 flex-shrink-0" />
        </div>

        {/* Headline — line 1 rotates through situations */}
        <div className="overflow-hidden mb-0.5">
          <motion.div
            key={sit.line1}
            ref={(el) => { headlineRefs.current[0] = el as any; }}
            initial={{ y: "108%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="text-[11vw] md:text-[8vw] font-bold leading-[0.87] tracking-[-0.035em] text-zinc-500"
          >
            {sit.line1}
          </motion.div>
        </div>

        {/* Headline — line 2: "in X hours." with hours input */}
        <div className="overflow-hidden mb-3 sm:mb-5">
          <div ref={(el) => { headlineRefs.current[1] = el; }}
            className="text-[11vw] md:text-[8vw] font-bold leading-[0.87] tracking-[-0.035em] text-zinc-700 flex items-baseline justify-center gap-3 flex-wrap">
            <span>in</span>
            <input
              type="number" min={1} max={72}
              value={deadlineHours}
              onChange={(e) => setDeadlineHours(Math.max(1, Math.min(72, Number(e.target.value) || 1)))}
              className="w-[2.2ch] bg-transparent text-red-400 font-bold text-center outline-none border-b-4 border-red-500/50 focus:border-red-400 transition-colors appearance-none"
              style={{ fontSize: "inherit", lineHeight: "inherit" }}
            />
            <span>hours.</span>
          </div>
        </div>

        {/* Headline — Phoenix rescues you */}
        <div className="overflow-hidden mb-0.5">
          <div ref={(el) => { headlineRefs.current[2] = el; }}
            className="text-[12vw] md:text-[9vw] font-bold leading-[0.84] tracking-[-0.04em] bg-gradient-to-r from-red-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
            Phoenix
          </div>
        </div>
        <div className="overflow-hidden mb-5 sm:mb-8">
          <div ref={(el) => { headlineRefs.current[3] = el; }}
            className="text-[12vw] md:text-[9vw] font-bold leading-[0.84] tracking-[-0.04em] text-zinc-100">
            rescues you.
          </div>
        </div>

        {/* Subtitle */}
        <div ref={subtitleRef} className="max-w-[360px] md:max-w-[460px] mb-4 sm:mb-6">
          <p className="text-sm md:text-[15px] text-zinc-500 leading-relaxed">
            Exam tomorrow. Project overdue. Interview in the morning. Whatever the crisis —
            diagnose it, cut to what matters, get a concrete hour-by-hour plan. Right now.
          </p>
        </div>

        {/* Situation chips */}
        <div ref={pillsRef} className="mb-5 sm:mb-7 flex flex-wrap items-center justify-center gap-2">
          {[
            { label: "📚 Exam Prep", color: "border-red-500/30 bg-red-950/30 text-red-400" },
            { label: "💼 Project Deadline", color: "border-orange-500/30 bg-orange-950/30 text-orange-400" },
            { label: "🎤 Interview Prep", color: "border-blue-500/30 bg-blue-950/30 text-blue-400" },
            { label: "📝 Assignment", color: "border-violet-500/30 bg-violet-950/30 text-violet-400" },
            { label: "🚀 Hackathon MVP", color: "border-emerald-500/30 bg-emerald-950/30 text-emerald-400" },
          ].map((chip) => (
            <span key={chip.label} className={`text-[10px] font-mono px-3 py-1 rounded-full border ${chip.color}`}>{chip.label}</span>
          ))}
        </div>

        {/* CTA */}
        <span className="shimmer-ring inline-block rounded-full" style={{ "--ring-color": "#FFD580" } as React.CSSProperties}>
          <button ref={ctaRef} onClick={() => onEnter(deadlineHours)}
            className="group relative overflow-hidden bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold py-4 px-10 rounded-full text-sm tracking-[0.1em] uppercase shadow-2xl shadow-red-600/25 flex items-center gap-3 hover:scale-[1.03] active:scale-[0.97] transition-transform duration-200">
            <Flame className="w-4 h-4" />
            <span>Start My Recovery</span>
            <span className="text-orange-200 transition-transform duration-200 group-hover:translate-x-1">→</span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
          </button>
        </span>

        {/* Trust pills */}
        <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-4 sm:gap-5 text-[10px] font-mono text-zinc-700 tracking-wider">
          {["4 AI Agents", "Gemini Powered", "Any Deadline", "No Auth Required"].map((t, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-zinc-700" />{t}
            </span>
          ))}
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="relative z-20 lg:hidden px-4 pb-6">
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
          {CARDS.map((card, idx) => (
            <motion.div key={card.num}
              initial={{ opacity: 0, y: 32, rotate: idx % 2 === 0 ? -4 : 4, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, rotate: idx % 2 === 0 ? -1.5 : 1.5, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.55 + idx * 0.1 }}
              className={`rounded-2xl border ${card.border} ${card.bg} p-3.5 shadow-lg will-change-transform ${idx % 2 === 0 ? "mobile-card-float-odd" : "mobile-card-float-even"}`}
              style={{ animationDelay: `${1.2 + idx * 0.15}s` }}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`w-1.5 h-1.5 rounded-full ${card.dot}`} />
                <span className={`text-[9px] font-mono tracking-[0.2em] ${card.accent} uppercase`}>{card.num}</span>
              </div>
              <div className="text-[11px] font-bold text-zinc-100 mb-2 leading-snug font-mono">{card.label}</div>
              <div className="space-y-1">
                {card.preview.map((line, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.75 + idx * 0.1 + i * 0.06, duration: 0.35 }}
                    className={`text-[10px] font-mono leading-relaxed ${
                      line.startsWith("✕") || line.startsWith("Timeline A") ? "text-red-400/80"
                      : line.startsWith("✓") || line.startsWith("Timeline B") ? "text-emerald-400/80"
                      : line.startsWith("→") ? "text-zinc-500"
                      : "text-zinc-400"
                    }`}>{line}</motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Marquee ── */}
      <div ref={marqueeRef} className="relative z-20 w-full overflow-hidden border-t border-zinc-800/50 py-3" style={{ opacity: 0 }}>
        <div ref={marqueeTrackRef} className="flex gap-7 whitespace-nowrap will-change-transform" style={{ width: "max-content" }}>
          {MARQUEE_ITEMS.concat(MARQUEE_ITEMS).map((item, i) => (
            <span key={i} className={`text-[10px] font-mono tracking-[0.22em] ${item === "·" ? "text-red-500/40" : "text-zinc-700"}`}>{item}</span>
          ))}
        </div>
      </div>

      {/* ── Bottom quote ── */}
      <div className="relative z-20 px-6 py-4 text-center border-t border-zinc-800/30">
        <p className="text-[10px] font-mono text-zinc-700 max-w-lg mx-auto leading-relaxed tracking-wide">
          "ChatGPT gives advice when asked. Phoenix performs a structured crisis-recovery workflow —
          diagnose your situation, cut to what matters, build a rescue plan, simulate both outcomes."
        </p>
      </div>
    </div>
  );
}
