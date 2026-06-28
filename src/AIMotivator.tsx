import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flame, RefreshCw, Zap, Volume2 } from "lucide-react";

interface MotivatorProps {
  goal: string;
  riskLevel: string;
  availableHours: number | "";
  successChanceAfter: number;
  doneCount: number;
  totalBlocks: number;
}

export default function AIMotivator({
  goal,
  riskLevel,
  availableHours,
  successChanceAfter,
  doneCount,
  totalBlocks,
}: MotivatorProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMotivate = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/motivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          riskLevel,
          availableHours,
          successChanceAfter,
          doneCount,
          totalBlocks,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      setMessage(data.message);
    } catch (err: any) {
      setError(err?.message || "Failed to get motivation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 bg-gradient-to-br from-orange-950/20 to-red-950/20 border border-orange-500/20 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-orange-500/10 flex items-center gap-2">
        <Flame className="w-4 h-4 text-orange-400" />
        <span className="text-[11px] font-mono uppercase tracking-wider text-orange-300 font-semibold">
          AI Crisis Coach
        </span>
        <span className="text-[9px] font-mono text-orange-500/60 bg-orange-950/40 px-1.5 py-0.5 rounded border border-orange-500/20">
          Gemini Powered
        </span>
      </div>

      <div className="px-4 pb-4 pt-3">
        <AnimatePresence mode="wait">
          {!message && !loading && (
            <motion.div key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-orange-200/60 mb-3 font-mono">
                Running low on fuel? Get a real-time pep talk from your AI crisis coach.
              </p>
              <button
                type="button"
                onClick={handleMotivate}
                className="w-full bg-gradient-to-r from-orange-600/70 to-red-600/70 hover:from-orange-500/80 hover:to-red-500/80 border border-orange-500/30 text-orange-100 font-semibold py-2.5 px-4 rounded-lg transition-all text-xs flex items-center justify-center gap-2 group"
              >
                <Zap className="w-4 h-4 group-hover:scale-125 transition-transform" />
                <span>Charge Me Up</span>
              </button>
              {error && (
                <p className="mt-2 text-[10px] text-red-400 font-mono text-center">{error}</p>
              )}
            </motion.div>
          )}

          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-3 py-3">
              <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
              <span className="text-xs font-mono text-orange-400">Generating battle cry...</span>
            </motion.div>
          )}

          {message && (
            <motion.div key="message" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="relative bg-orange-950/20 border border-orange-500/15 rounded-xl p-4 mb-3">
                <div className="absolute -top-2 left-4">
                  <span className="text-orange-400 text-xs font-mono bg-zinc-950 px-1">Coach</span>
                </div>
                <p className="text-sm text-orange-100 leading-relaxed font-medium italic">"{message}"</p>
              </div>
              <button
                type="button"
                onClick={handleMotivate}
                className="text-[10px] font-mono text-orange-500 hover:text-orange-300 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> another one
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}