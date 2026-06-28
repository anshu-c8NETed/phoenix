/**
 * Phoenix Design System — Glass Gradient Aesthetic
 * Drop-in replacement tokens for the Zinc/flat look → glass orb look.
 *
 * Usage:
 *   import { DS, GlassCard, GlassInput, GlassButton, OrbBg } from "./DesignSystem";
 */

import React from "react";

/* ── Core Tokens ─────────────────────────────────────────── */
export const DS = {
  // Surface glass layers
  glass: "rgba(255,255,255,0.03)",
  glassBorder: "rgba(255,255,255,0.07)",
  glassMid: "rgba(10,10,16,0.7)",
  glassPanel: "rgba(8,8,12,0.8)",

  // Agent accent colours — unchanged from original
  red:    { text: "#EF4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)",   glow: "rgba(239,68,68,0.15)"   },
  orange: { text: "#F97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.2)",  glow: "rgba(249,115,22,0.15)"  },
  blue:   { text: "#60A5FA", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.2)",  glow: "rgba(96,165,250,0.15)"  },
  violet: { text: "#A78BFA", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)", glow: "rgba(167,139,250,0.15)" },
  emerald:{ text: "#34D399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)",  glow: "rgba(52,211,153,0.15)"  },
  amber:  { text: "#FBBF24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)",  glow: "rgba(251,191,36,0.15)"  },
  zinc:   { text: "#71717A", bg: "rgba(113,113,122,0.08)", border: "rgba(113,113,122,0.15)", glow: "rgba(113,113,122,0.1)" },

  // Fire gradient
  fireGradient: "linear-gradient(135deg, #FF6B6B 0%, #FFA647 50%, #FFD166 100%)",
  fireBg:       "linear-gradient(135deg, #C0392B 0%, #E74C3C 30%, #E67E22 70%, #F39C12 100%)",
  fireShadow:   "0 4px 40px rgba(220,50,30,0.35), 0 0 0 1px rgba(255,255,255,0.08) inset",
};

/* ── Ambient Orb Background ──────────────────────────────── */
export function OrbBg() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden style={{ zIndex: 0 }}>
      {/* Red/orange orb — top right */}
      <div style={{
        position: "absolute", top: "-5%", right: "-5%",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(180,30,20,0.15) 0%, transparent 70%)",
        filter: "blur(80px)",
      }} />
      {/* Blue orb — bottom left */}
      <div style={{
        position: "absolute", bottom: "-5%", left: "-5%",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(20,60,180,0.1) 0%, transparent 70%)",
        filter: "blur(80px)",
      }} />
      {/* Subtle orange — center */}
      <div style={{
        position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)",
        width: 800, height: 300, borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(180,60,10,0.06) 0%, transparent 70%)",
        filter: "blur(60px)",
      }} />
    </div>
  );
}

/* ── Glass Card ──────────────────────────────────────────── */
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
  style?: React.CSSProperties;
}

export function GlassCard({ children, className = "", accentColor, style }: GlassCardProps) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: DS.glassMid,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: `1px solid ${accentColor ? accentColor.replace("0.2", "0.12") : DS.glassBorder}`,
        boxShadow: accentColor
          ? `0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.4)`
          : `0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 32px rgba(0,0,0,0.3)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Glass Input ─────────────────────────────────────────── */
interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  focusColor?: string;
}

export function GlassInput({ focusColor = "#EF4444", className = "", style, ...props }: GlassInputProps) {
  const [focused, setFocused] = React.useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      className={`w-full text-sm text-zinc-100 placeholder-zinc-700 transition-all duration-200 ${className}`}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${focused ? focusColor + "55" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 10,
        padding: "10px 14px",
        outline: "none",
        boxShadow: focused ? `0 0 0 3px ${focusColor}18, 0 0 20px ${focusColor}12` : "none",
        ...style,
      }}
    />
  );
}

/* ── Glass Textarea ──────────────────────────────────────── */
interface GlassTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  focusColor?: string;
}

export function GlassTextarea({ focusColor = "#F97316", className = "", style, ...props }: GlassTextareaProps) {
  const [focused, setFocused] = React.useState(false);
  return (
    <textarea
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      className={`w-full text-sm font-mono text-zinc-100 placeholder-zinc-700 transition-all duration-200 resize-none ${className}`}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${focused ? focusColor + "55" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 10,
        padding: "10px 14px",
        outline: "none",
        boxShadow: focused ? `0 0 0 3px ${focusColor}18` : "none",
        lineHeight: 1.6,
        ...style,
      }}
    />
  );
}

/* ── Fire Button (primary CTA) ───────────────────────────── */
interface FireButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function FireButton({ children, size = "md", loading = false, className = "", style, ...props }: FireButtonProps) {
  const sizes = {
    sm: { padding: "8px 16px", fontSize: 11, borderRadius: 10 },
    md: { padding: "12px 24px", fontSize: 13, borderRadius: 14 },
    lg: { padding: "16px 40px", fontSize: 14, borderRadius: 999 },
  };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`relative overflow-hidden font-semibold text-white transition-all duration-200 
        hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none
        flex items-center justify-center gap-2 ${className}`}
      style={{
        ...sizes[size],
        background: loading ? "rgba(150,30,20,0.5)" : DS.fireBg,
        boxShadow: DS.fireShadow,
        letterSpacing: "0.04em",
        ...style,
      }}
    >
      {children}
      {/* Shimmer sweep */}
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
          transform: "translateX(-100%)",
          transition: "transform 0.6s ease",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateX(100%)"; }}
      />
    </button>
  );
}

/* ── Ghost Button ────────────────────────────────────────── */
interface GhostButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  accentColor?: string;
}

export function GhostButton({ children, accentColor, className = "", style, ...props }: GhostButtonProps) {
  return (
    <button
      {...props}
      className={`relative font-semibold text-sm transition-all duration-200 
        hover:brightness-125 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none
        flex items-center justify-center gap-2 ${className}`}
      style={{
        padding: "10px 20px",
        borderRadius: 12,
        background: accentColor ? accentColor.replace("0.2", "0.08") : "rgba(255,255,255,0.04)",
        border: `1px solid ${accentColor || "rgba(255,255,255,0.1)"}`,
        color: accentColor ? accentColor.replace("rgba", "rgb").replace(",0.2)", ")").replace(",0.08)",")")  : "rgba(255,255,255,0.7)",
        backdropFilter: "blur(8px)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ── Stat Badge ──────────────────────────────────────────── */
export function StatBadge({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div
      className="text-center p-4 rounded-xl"
      style={{
        background: accent ? `${accent.replace("0.2","0.05")}` : "rgba(255,255,255,0.02)",
        border: `1px solid ${accent || "rgba(255,255,255,0.06)"}`,
      }}
    >
      <div className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: "rgba(113,113,122,0.7)", letterSpacing: "0.15em" }}>{label}</div>
      <div className="text-2xl font-bold" style={{ color: accent ? accent.replace(/,[\d.]+\)$/, ",1)").replace("rgba","rgb") : "#f4f4f5" }}>{value}</div>
    </div>
  );
}

/* ── Section Divider ─────────────────────────────────────── */
export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 my-10">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: "rgba(113,113,122,0.5)" }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

/* ── Preset Card ─────────────────────────────────────────── */
interface PresetCardProps {
  title: string;
  goal: string;
  hours: number;
  progress: number;
  badge?: boolean;
  onClick: () => void;
}

export function PresetCard({ title, goal, hours, progress, badge, onClick }: PresetCardProps) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left w-full transition-all duration-300 rounded-xl overflow-hidden"
      style={{
        background: hovered
          ? badge ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)"
          : badge ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${hovered
          ? badge ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.12)"
          : badge ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)"}`,
        boxShadow: hovered && badge ? "0 4px 20px rgba(239,68,68,0.1)" : "none",
        transform: hovered ? "translateY(-1px)" : "none",
        padding: "14px 16px",
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px transition-opacity duration-300"
        style={{
          background: badge
            ? "linear-gradient(90deg, transparent, rgba(239,68,68,0.6), transparent)"
            : "linear-gradient(90deg, transparent, rgba(249,115,22,0.4), transparent)",
          opacity: hovered ? 1 : 0,
        }}
      />
      {badge && (
        <span
          className="text-[8px] font-mono px-1.5 py-0.5 rounded float-right"
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#EF4444",
            letterSpacing: "0.1em",
          }}
        >
          YOU'RE HERE
        </span>
      )}
      <div
        className="text-[10px] font-mono mb-1 uppercase tracking-wider"
        style={{ color: badge ? "#EF4444" : hovered ? "#F97316" : "rgba(113,113,122,0.6)" }}
      >
        {title}
      </div>
      <p className="text-sm font-medium text-zinc-200 line-clamp-1 mb-2">{goal}</p>
      <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: "rgba(113,113,122,0.5)" }}>
        <span>{hours}h left</span>
        <span style={{ color: "rgba(63,63,70,0.6)" }}>·</span>
        <span>{progress}% done</span>
      </div>
    </button>
  );
}

/* ── Agent Tag ───────────────────────────────────────────── */
export function AgentTag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-[9px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border"
      style={{
        color: color,
        background: color.replace(/,[\d.]+\)$/, ",0.08)"),
        border: `1px solid ${color.replace(/,[\d.]+\)$/, ",0.2)")}`,
      }}
    >
      {label}
    </span>
  );
}