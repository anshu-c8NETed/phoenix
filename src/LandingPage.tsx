import React, { useRef, useLayoutEffect, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flame } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { EmberField } from "./EmberField";
import Footer from "./Footer";

gsap.registerPlugin(ScrollTrigger);

interface LandingPageProps {
  onEnter: (deadlineHours?: number) => void;
}

const CARDS = [
  {
    num: "01",
    label: "Crisis Assessment",
    preview: ["CRITICAL — 9h deficit", "→ 4 chapters untouched", "→ Weak areas identified", "→ Demo strategy locked"],
    border: "rgba(239,68,68,0.3)",
    bg: "rgba(239,68,68,0.07)",
    accent: "#EF4444",
    pos: { top: "8%", left: "2%" },
    rotate: -9,
    glowColor: "rgba(239,68,68,0.15)",
  },
  {
    num: "02",
    label: "Survival Version",
    preview: ["✓ Core topics", "✓ High-yield sections", "✕ Extended proofs (skip)", "✕ Optional reading", "20% → 80% odds"],
    border: "rgba(249,115,22,0.3)",
    bg: "rgba(249,115,22,0.07)",
    accent: "#F97316",
    pos: { top: "6%", right: "2%" },
    rotate: 8,
    glowColor: "rgba(249,115,22,0.15)",
  },
  {
    num: "03",
    label: "Rescue Planner",
    preview: ["H0–2: High-yield review", "H2–4: Practice problems", "H4–5: Weak spots", "H5–6: Final read-through"],
    border: "rgba(96,165,250,0.3)",
    bg: "rgba(96,165,250,0.07)",
    accent: "#60A5FA",
    pos: { bottom: "15%", left: "1%" },
    rotate: 6,
    glowColor: "rgba(96,165,250,0.15)",
  },
  {
    num: "04",
    label: "Simulation Engine",
    preview: ["Timeline A: ✕ Failed", "→ Ran out of time", "Timeline B: ✓ Passed", "→ Phoenix plan executed"],
    border: "rgba(167,139,250,0.3)",
    bg: "rgba(167,139,250,0.07)",
    accent: "#A78BFA",
    pos: { bottom: "13%", right: "1%" },
    rotate: -7,
    glowColor: "rgba(167,139,250,0.15)",
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

const SITUATIONS = [
  { line1: "Your exam is", suffix: "hours." },
  { line1: "Your deadline is", suffix: "hours." },
  { line1: "Your interview is", suffix: "hours." },
  { line1: "Your submission is", suffix: "hours." },
  { line1: "Your presentation is", suffix: "hours." },
];

const CHIPS = [
  { label: "📚 Exam Prep", glow: "rgba(239,68,68,0.4)" },
  { label: "💼 Project Deadline", glow: "rgba(249,115,22,0.4)" },
  { label: "🎤 Interview Prep", glow: "rgba(96,165,250,0.4)" },
  { label: "📝 Assignment", glow: "rgba(167,139,250,0.4)" },
  { label: "🚀 Hackathon MVP", glow: "rgba(52,211,153,0.4)" },
];

export default function LandingPage({ onEnter }: LandingPageProps) {
  const [deadlineHours, setDeadlineHours] = useState(6);
  const [situationIdx, setSituationIdx] = useState(0);
  const [hoveredChip, setHoveredChip] = useState<number | null>(null);

  const sectionRef = useRef<HTMLDivElement>(null);
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const headlineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueeTrackRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);

  const emberContainerRef = useRef<HTMLDivElement>(null);
  const emberFieldRef = useRef<EmberField | null>(null);
  const deadlineHoursRef = useRef(deadlineHours);
  deadlineHoursRef.current = deadlineHours;

  useEffect(() => {
    const container = emberContainerRef.current;
    if (!container) return;
    const field = new EmberField(container, { particleCount: 180 });
    emberFieldRef.current = field;
    const urgencyInterval = setInterval(() => {
      const hours = deadlineHoursRef.current;
      const urgency = 1 - Math.min(1, Math.max(0, (hours - 1) / 71));
      field.setUrgency(urgency);
    }, 200);
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
  }, []);

  useEffect(() => {
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
      gsap.from(counterRef.current, { opacity: 0, y: 8, duration: 0.5, delay: 1.4 });
      if (marqueeTrackRef.current) {
        gsap.to(marqueeTrackRef.current, { x: "-50%", duration: 28, ease: "none", repeat: -1 });
      }
      innerRefs.current.forEach((inner, idx) => {
        const wrapper = wrapperRefs.current[idx];
        if (!inner || !wrapper) return;
        const measureOffset = () => {
          const wRect = wrapper.getBoundingClientRect();
          const sRect = section.getBoundingClientRect();
          return {
            x: sRect.left + sRect.width / 2 - (wRect.left + wRect.width / 2),
            y: sRect.top + sRect.height / 2 - (wRect.top + wRect.height / 2),
          };
        };
        gsap.fromTo(
          inner,
          { x: () => measureOffset().x, y: () => measureOffset().y, scale: initials[idx].scale, rotate: initials[idx].rotation, opacity: 0 },
          { x: 0, y: 0, scale: 1, rotate: CARDS[idx].rotate, opacity: 1, duration: 1.3, ease: "back.inOut(1.6)", delay: 0.4 + idx * 0.07 }
        );
      });
    }, section);
    return () => ctx.revert();
  }, []);

  const sit = SITUATIONS[situationIdx];

  return (
    <div
      ref={sectionRef}
      className="relative min-h-screen w-full text-zinc-100 overflow-hidden flex flex-col select-none"
      style={{ background: "#050507" }}
    >
      {/* ── Deep gradient orbs — the signature aesthetic ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {/* Primary — crimson-orange orb, large, bottom-center */}
        <div
          className="absolute"
          style={{
            bottom: "-15%", left: "25%",
            width: "70vw", height: "65vw",
            maxWidth: 900, maxHeight: 900,
            background: "radial-gradient(ellipse at center, rgba(220,40,30,0.55) 0%, rgba(180,60,10,0.35) 35%, transparent 70%)",
            filter: "blur(80px)",
            borderRadius: "50%",
          }}
        />
        {/* Secondary — electric blue, top-right */}
        <div
          className="absolute"
          style={{
            top: "-10%", right: "-5%",
            width: "50vw", height: "50vw",
            maxWidth: 700, maxHeight: 700,
            background: "radial-gradient(ellipse at center, rgba(30,80,220,0.45) 0%, rgba(80,40,200,0.25) 40%, transparent 70%)",
            filter: "blur(90px)",
            borderRadius: "50%",
          }}
        />
        {/* Accent — amber, left mid */}
        <div
          className="absolute"
          style={{
            top: "30%", left: "-8%",
            width: "35vw", height: "35vw",
            maxWidth: 500, maxHeight: 500,
            background: "radial-gradient(ellipse at center, rgba(200,80,20,0.3) 0%, transparent 70%)",
            filter: "blur(70px)",
            borderRadius: "50%",
          }}
        />
        {/* Subtle violet pulse, center */}
        <div
          className="absolute"
          style={{
            top: "15%", left: "40%", transform: "translateX(-50%)",
            width: "40vw", height: "40vw",
            maxWidth: 600, maxHeight: 600,
            background: "radial-gradient(ellipse at center, rgba(100,40,180,0.2) 0%, transparent 65%)",
            filter: "blur(60px)",
            borderRadius: "50%",
          }}
        />
      </div>

      {/* Ember field */}
      <div ref={emberContainerRef} className="pointer-events-none absolute inset-0 z-[1] opacity-70" aria-hidden />

      {/* Noise texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-[2] opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
        aria-hidden
      />

      {/* ── Nav ── */}
      <div ref={navRef} className="relative z-30 flex items-center justify-between px-6 md:px-10 py-6">
        <div className="flex items-center gap-2.5">
          <div
            className="p-1.5 rounded-xl shadow-lg"
            style={{ background: "linear-gradient(135deg, #EF4444, #F97316)", boxShadow: "0 0 20px rgba(239,68,68,0.4)" }}
          >
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span
            className="text-base font-bold tracking-tight"
            style={{ background: "linear-gradient(90deg, #FF6B6B, #FFA647, #FFD166)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Phoenix
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            LIVE
          </span>
          <button
            onClick={() => onEnter(deadlineHours)}
            className="text-[11px] font-mono text-zinc-300 hover:text-white border border-zinc-700/60 hover:border-zinc-500 px-4 py-1.5 rounded-full transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(10px)" }}
          >
            Launch →
          </button>
        </div>
      </div>

      {/* ── Desktop floating cards ── */}
      {CARDS.map((card, idx) => (
        <div
          key={card.num}
          ref={(el) => { wrapperRefs.current[idx] = el; }}
          className="absolute z-10 hidden lg:block"
          style={{ ...card.pos, width: 210 }}
        >
          <div
            ref={(el) => { innerRefs.current[idx] = el; }}
            className="rounded-2xl p-4 will-change-transform"
            style={{
              opacity: 0,
              border: `1px solid ${card.border}`,
              background: card.bg,
              backdropFilter: "blur(20px)",
              boxShadow: `0 8px 32px ${card.glowColor}, 0 0 0 0.5px rgba(255,255,255,0.04) inset`,
            }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: card.accent }} />
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: card.accent }}>{card.num}</span>
            </div>
            <div className="text-xs font-bold text-zinc-100 mb-2 leading-snug font-mono">{card.label}</div>
            <div className="space-y-1">
              {card.preview.map((line, i) => (
                <div
                  key={i}
                  className="text-[10px] font-mono"
                  style={{
                    color: line.startsWith("✕") || line.startsWith("Timeline A") ? "rgba(239,68,68,0.75)"
                      : line.startsWith("✓") || line.startsWith("Timeline B") ? "rgba(52,211,153,0.8)"
                      : line.startsWith("→") ? "rgba(161,161,170,0.6)"
                      : "rgba(212,212,216,0.7)",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* ── Hero ── */}
      <div className="relative z-20 flex flex-col items-center justify-center flex-1 px-6 text-center pt-4 pb-2">

        {/* Eyebrow */}
        <div ref={eyebrowRef} className="flex items-center gap-3 mb-6 sm:mb-10">
          <div className="w-8 sm:w-14 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.5))" }} />
          <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.25em] sm:tracking-[0.32em] text-red-400/80 uppercase">
            Last Minute Life Saver
          </span>
          <div className="w-8 sm:w-14 h-px" style={{ background: "linear-gradient(90deg, rgba(239,68,68,0.5), transparent)" }} />
        </div>

        {/* Headline block */}
        <div className="mb-4 sm:mb-6 space-y-0">
          {/* Rotating situation line */}
          <div className="overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={sit.line1}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                ref={(el) => { headlineRefs.current[0] = el as any; }}
                className="font-bold leading-[0.88] tracking-[-0.035em]"
                style={{
                  fontSize: "clamp(40px, 9vw, 96px)",
                  color: "rgba(113,113,122,0.7)",
                }}
              >
                {sit.line1}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* "in X hours." line */}
          <div className="overflow-hidden">
            <div
              ref={(el) => { headlineRefs.current[1] = el; }}
              className="font-bold leading-[0.88] tracking-[-0.035em] flex items-baseline justify-center gap-3 flex-wrap"
              style={{ fontSize: "clamp(40px, 9vw, 96px)", color: "rgba(82,82,91,0.7)" }}
            >
              <span>in</span>
              <input
                type="number" min={1} max={72}
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(Math.max(1, Math.min(72, Number(e.target.value) || 1)))}
                className="bg-transparent text-center outline-none appearance-none"
                style={{
                  width: "2.2ch",
                  fontSize: "inherit",
                  lineHeight: "inherit",
                  color: "#FF6B6B",
                  fontWeight: "bold",
                  borderBottom: "4px solid rgba(239,68,68,0.5)",
                  caretColor: "#EF4444",
                }}
              />
              <span>{sit.suffix}</span>
            </div>
          </div>

          {/* Phoenix */}
          <div className="overflow-hidden">
            <div
              ref={(el) => { headlineRefs.current[2] = el; }}
              className="font-bold leading-[0.84] tracking-[-0.04em]"
              style={{
                fontSize: "clamp(44px, 10vw, 108px)",
                background: "linear-gradient(135deg, #FF6B6B 0%, #FF8C42 30%, #FFD166 60%, #FF6B6B 100%)",
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "gradientShift 4s ease infinite",
              }}
            >
              Phoenix
            </div>
          </div>
          <div className="overflow-hidden">
            <div
              ref={(el) => { headlineRefs.current[3] = el; }}
              className="font-bold leading-[0.84] tracking-[-0.04em] text-zinc-100"
              style={{ fontSize: "clamp(44px, 10vw, 108px)" }}
            >
              rescues you.
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <div ref={subtitleRef} className="max-w-sm md:max-w-md mb-6 sm:mb-8">
          <p className="text-[13px] md:text-sm text-zinc-500 leading-relaxed">
            Exam tomorrow. Project overdue. Interview in the morning. Whatever the crisis —
            diagnose it, cut to what matters, get a concrete hour-by-hour plan.
          </p>
        </div>

        {/* Situation chips */}
        <div ref={pillsRef} className="mb-6 sm:mb-8 flex flex-wrap items-center justify-center gap-2">
          {CHIPS.map((chip, i) => (
            <button
              key={chip.label}
              type="button"
              onMouseEnter={() => setHoveredChip(i)}
              onMouseLeave={() => setHoveredChip(null)}
              className="text-[10px] font-mono px-3 py-1.5 rounded-full border transition-all duration-300"
              style={{
                border: `1px solid ${hoveredChip === i ? chip.glow : "rgba(63,63,70,0.6)"}`,
                background: hoveredChip === i ? `${chip.glow.replace("0.4", "0.08")}` : "rgba(255,255,255,0.02)",
                color: hoveredChip === i ? "#ffffff" : "rgba(161,161,170,0.7)",
                backdropFilter: "blur(8px)",
                boxShadow: hoveredChip === i ? `0 0 20px ${chip.glow}` : "none",
                transform: hoveredChip === i ? "translateY(-1px)" : "none",
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="relative group" style={{ display: "inline-block" }}>
          {/* Glow behind button */}
          <div
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "linear-gradient(135deg, rgba(239,68,68,0.6), rgba(249,115,22,0.6))",
              filter: "blur(20px)",
              transform: "scale(1.2)",
            }}
          />
          <button
            ref={ctaRef}
            onClick={() => onEnter(deadlineHours)}
            className="relative overflow-hidden font-bold py-4 px-10 rounded-full text-sm tracking-[0.08em] uppercase text-white flex items-center gap-3 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #C0392B 0%, #E74C3C 30%, #E67E22 70%, #F39C12 100%)",
              boxShadow: "0 4px 40px rgba(220,50,30,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset",
            }}
          >
            <Flame className="w-4 h-4" />
            <span>Start My Recovery</span>
            <span className="opacity-70 group-hover:translate-x-1 transition-transform duration-200">→</span>
            {/* Shimmer */}
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }}
            />
          </button>
        </div>

        {/* Trust pills */}
        <div ref={counterRef} className="mt-5 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[10px] font-mono text-zinc-700 tracking-wider">
          {["4 AI Agents", "Gemini Powered", "Any Deadline", "No Auth Required"].map((t, i) => (
            <span key={i} className="flex items-center gap-1.5 hover:text-zinc-500 transition-colors cursor-default">
              <span className="w-1 h-1 rounded-full bg-zinc-700" />{t}
            </span>
          ))}
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="relative z-20 lg:hidden px-4 pb-6">
        <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
          {CARDS.map((card, idx) => (
            <motion.div
              key={card.num}
              initial={{ opacity: 0, y: 32, rotate: idx % 2 === 0 ? -4 : 4, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, rotate: idx % 2 === 0 ? -1.5 : 1.5, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.55 + idx * 0.1 }}
              className={`rounded-2xl p-3.5 will-change-transform ${idx % 2 === 0 ? "mobile-card-float-odd" : "mobile-card-float-even"}`}
              style={{
                border: `1px solid ${card.border}`,
                background: card.bg,
                backdropFilter: "blur(16px)",
                boxShadow: `0 4px 20px ${card.glowColor}`,
                animationDelay: `${1.2 + idx * 0.15}s`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: card.accent }} />
                <span className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: card.accent }}>{card.num}</span>
              </div>
              <div className="text-[11px] font-bold text-zinc-100 mb-2 leading-snug font-mono">{card.label}</div>
              <div className="space-y-1">
                {card.preview.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.75 + idx * 0.1 + i * 0.06, duration: 0.35 }}
                    className="text-[10px] font-mono leading-relaxed"
                    style={{
                      color: line.startsWith("✕") || line.startsWith("Timeline A") ? "rgba(239,68,68,0.8)"
                        : line.startsWith("✓") || line.startsWith("Timeline B") ? "rgba(52,211,153,0.8)"
                        : line.startsWith("→") ? "rgba(161,161,170,0.5)"
                        : "rgba(212,212,216,0.65)",
                    }}
                  >
                    {line}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Marquee ── */}
      <div
        ref={marqueeRef}
        className="relative z-20 w-full overflow-hidden py-3"
        style={{ opacity: 0, borderTop: "1px solid rgba(63,63,70,0.4)" }}
      >
        <div ref={marqueeTrackRef} className="flex gap-7 whitespace-nowrap will-change-transform" style={{ width: "max-content" }}>
          {MARQUEE_ITEMS.concat(MARQUEE_ITEMS).map((item, i) => (
            <span
              key={i}
              className="text-[10px] font-mono tracking-[0.22em]"
              style={{ color: item === "·" ? "rgba(239,68,68,0.35)" : "rgba(82,82,91,0.6)" }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Bottom quote ── */}
      <div className="relative z-20 px-6 py-4 text-center" style={{ borderTop: "1px solid rgba(39,39,42,0.4)" }}>
        <p className="text-[10px] font-mono text-zinc-700 max-w-lg mx-auto leading-relaxed tracking-wide">
          "ChatGPT gives advice when asked. Phoenix performs a structured crisis-recovery workflow —
          diagnose your situation, cut to what matters, build a rescue plan, simulate both outcomes."
        </p>
      </div>

      <Footer />

      {/* gradient shift keyframe injected inline */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}