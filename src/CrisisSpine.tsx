// ════════════════════════════════════════════════════════════
//  Phoenix — Crisis Spine
//  The connecting thread running through all 4 agents. Idle:
//  a quiet gradient line (red → amber → blue → emerald, mapped
//  to each agent's accent). On each agent's completion: a brief
//  ember flicker chains downward from that agent's position to
//  the current bottom of the spine, with a moving brightness
//  window trailing it — visually "this result now feeds
//  everything below it."
// ════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import gsap from "gsap";

export interface CrisisSpineHandle {
  /** Fire a chain-down flicker from `fromY` to the current bottom of the spine. */
  fireFrom: (fromY: number) => void;
}

interface CrisisSpineProps {
  /** Total height of the spine in px — grows as later agents mount. */
  height: number;
}

// Same agent accent colors already used in AGENTS / AgentsShowcase —
// reused here rather than inventing a new palette.
const STOP_COLORS = ["#EF4444", "#F97316", "#60A5FA", "#34D399"]; // red, orange, blue, emerald

const CrisisSpine = forwardRef<CrisisSpineHandle, CrisisSpineProps>(function CrisisSpine(
  { height },
  ref
) {
  const pathRef = useRef<SVGPathElement>(null);
  const brightPathRef = useRef<SVGPathElement>(null);
  const emberGroupRef = useRef<SVGGElement>(null);
  const pathLengthRef = useRef(0);
  const builtHeightRef = useRef(0);

  // Slightly organic curve rather than a dead-straight line — a gentle
  // S-sway, recomputed whenever height changes.
  const buildPathD = (h: number) => {
    if (h <= 0) return "";
    const sway = 6;
    const segments = 5;
    let d = `M4,0`;
    for (let i = 1; i <= segments; i++) {
      const y = (h / segments) * i;
      const x = 4 + (i % 2 === 0 ? sway : -sway);
      const prevY = (h / segments) * (i - 1);
      const midY = (y + prevY) / 2;
      d += ` Q${x},${midY} 4,${y}`;
    }
    return d;
  };

  useEffect(() => {
    const path = pathRef.current;
    const bright = brightPathRef.current;
    if (!path || !bright || height <= 0) return;

    const d = buildPathD(height);
    path.setAttribute("d", d);
    bright.setAttribute("d", d);

    const length = path.getTotalLength();
    pathLengthRef.current = length;
    builtHeightRef.current = height;

    // Bright overlay starts fully hidden (dash covers nothing visible)
    bright.style.strokeDasharray = `0 ${length}`;
  }, [height]);

  const attemptFire = (fromY: number, attempt: number) => {
    const path = pathRef.current;
    const bright = brightPathRef.current;
    const emberGroup = emberGroupRef.current;
    if (!path || !bright) return;

    const length = pathLengthRef.current || path.getTotalLength();

    // Path may not have a real `d` yet (height just changed, effect
    // hasn't run, or this is the very first paint). Rather than silently
    // dropping the flicker, retry for a few frames — the spine almost
    // always becomes measurable within 1-2 frames of mounting.
    if (length <= 0) {
      if (attempt >= 10) return; // ~10 frames (~160ms) — give up gracefully
      requestAnimationFrame(() => attemptFire(fromY, attempt + 1));
      return;
    }

    const currentHeight = builtHeightRef.current || height || length;
    const startFraction = Math.max(0, Math.min(1, fromY / currentHeight));
    const startLength = startFraction * length;
    const travelLength = length - startLength;
    if (travelLength <= 0) return;

    gsap.killTweensOf(bright);

    const state = { progress: 0 };
    const windowSize = Math.min(60, travelLength * 0.4);

    gsap.to(state, {
      progress: 1,
      duration: 1.1,
      ease: "power1.inOut",
      onUpdate: () => {
        const leadEdge = startLength + travelLength * state.progress;
        const trailEdge = Math.max(startLength, leadEdge - windowSize);
        bright.style.strokeDasharray = `0 ${trailEdge} ${leadEdge - trailEdge} ${length}`;

        if (emberGroup && path) {
          const pt = path.getPointAtLength(Math.min(leadEdge, length));
          emberGroup.setAttribute("transform", `translate(${pt.x - 4}, ${pt.y - 10})`);
          emberGroup.style.opacity = "1";
        }
      },
      onComplete: () => {
        gsap.to(bright, {
          duration: 0.5,
          onUpdate: () => { bright.style.strokeDasharray = `0 ${length}`; },
        });
        if (emberGroup) {
          gsap.to(emberGroup, { opacity: 0, duration: 0.5 });
        }
      },
    });
  };

  useImperativeHandle(ref, () => ({
    fireFrom(fromY: number) {
      attemptFire(fromY, 0);
    },
  }), [height]);

  return (
    <svg
      className="absolute left-0 top-0 pointer-events-none overflow-visible"
      width="8" height={Math.max(height, 1)}
      aria-hidden
    >
      <defs>
        <linearGradient id="spine-idle-gradient" x1="0" y1="0" x2="0" y2="1">
          {STOP_COLORS.map((c, i) => (
            <stop key={i} offset={`${(i / (STOP_COLORS.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
      </defs>

      {/* Idle thread — always present, quiet */}
      <path
        ref={pathRef}
        fill="none"
        stroke="url(#spine-idle-gradient)"
        strokeWidth="1.5"
        strokeOpacity="0.3"
        strokeLinecap="round"
      />

      {/* Bright moving window — revealed only during a chain-down flicker */}
      <path
        ref={brightPathRef}
        fill="none"
        stroke="url(#spine-idle-gradient)"
        strokeWidth="2"
        strokeOpacity="0.85"
        strokeLinecap="round"
      />

      {/* Ember glyph riding the leading edge of the flicker */}
      <g ref={emberGroupRef} style={{ opacity: 0 }}>
        <path d="M2,10 Q4,2 5,5 Q7,0 8,10 Z" fill="#FCDE5A" opacity="0.9" />
      </g>
    </svg>
  );
});

export default CrisisSpine;