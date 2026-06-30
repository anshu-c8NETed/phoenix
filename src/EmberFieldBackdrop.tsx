// ════════════════════════════════════════════════════════════
//  Phoenix — Ember Field Backdrop
//  Mounts the same EmberField WebGL particle system used on the
//  landing hero, but as a persistent, low-key layer behind the
//  entire app shell — so the "this app is alive" feeling carries
//  past the landing page instead of stopping at it.
//  Static-but-present: fixed low urgency, no per-frame wiring
//  beyond what EmberField already does internally.
// ════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from "react";
import { EmberField } from "./EmberField";

interface EmberFieldBackdropProps {
  /** 0 (calm) → 1 (critical). Defaults to a quiet ambient drift. */
  urgency?: number;
  particleCount?: number;
  className?: string;
}

export default function EmberFieldBackdrop({
  urgency = 0.15,
  particleCount = 70,
  className = "",
}: EmberFieldBackdropProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<EmberField | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const field = new EmberField(container, { particleCount });
    fieldRef.current = field;
    field.setUrgency(urgency);

    return () => {
      field.destroy();
      fieldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Allow urgency to be updated without re-mounting the WebGL scene.
  useEffect(() => {
    fieldRef.current?.setUrgency(urgency);
  }, [urgency]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none fixed inset-0 z-0 ${className || "opacity-50"}`}
      aria-hidden
    />
  );
}