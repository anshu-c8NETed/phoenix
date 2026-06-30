// ════════════════════════════════════════════════════════════
//  Phoenix — Team Notification Agent (Agent 06)
//  Autonomously drafts a Slack/Email update explaining the
//  delay and the new Phoenix rescue plan to teammates.
//  User reviews, copies, and sends — one click.
// ════════════════════════════════════════════════════════════

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, RefreshCw, Copy, Check, Mail, MessageSquare, Zap, ChevronDown, ChevronUp } from "lucide-react";

interface RescueBlock {
  hour_range: string;
  task: string;
  type: string;
}

interface TeamNotifyProps {
  goal: string;
  riskLevel: string;
  availableHours: number | "";
  keepFeatures: string[];
  cutFeatures: string[];
  successChanceBefore: number;
  successChanceAfter: number;
  rescueBlocks: RescueBlock[];
  bufferHours: number;
}

type Mode = "slack" | "email";
type State = "idle" | "loading" | "done" | "error";

export default function TeamNotify({
  goal,
  riskLevel,
  availableHours,
  keepFeatures,
  cutFeatures,
  successChanceBefore,
  successChanceAfter,
  rescueBlocks,
  bufferHours,
}: TeamNotifyProps) {
  const [mode, setMode] = useState<Mode>("slack");
  const [state, setState] = useState<State>("idle");
  const [draft, setDraft] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [recipientCtx, setRecipientCtx] = useState(""); // optional: who to address

  const handleGenerate = async () => {
    setState("loading");
    setError(null);
    setDraft("");

    try {
      const res = await fetch("/api/team-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          riskLevel,
          availableHours,
          keepFeatures,
          cutFeatures,
          successChanceBefore,
          successChanceAfter,
          rescueBlocks,
          bufferHours,
          mode,
          recipientCtx: recipientCtx.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setDraft(data.message);
      setState("done");
      setExpanded(true);
    } catch (e: any) {
      setError(e?.message || "Failed to generate notification.");
      setState("error");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  };

  const handleRegenerate = () => {
    setState("idle");
    setDraft("");
    setExpanded(false);
  };

  return (
    <div className="mt-6 bg-zinc-950/60 border border-zinc-800/80 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-semibold">
            Team Notification
          </span>
          <span className="text-[9px] font-mono text-violet-400 bg-violet-950/40 border border-violet-500/20 px-1.5 py-0.5 rounded">
            Agent 06
          </span>
        </div>
        {state === "done" && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors"
          >
            {expanded ? <><ChevronUp className="w-3 h-3" /> collapse</> : <><ChevronDown className="w-3 h-3" /> expand</>}
          </button>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        <AnimatePresence mode="wait">

          {/* Idle — configure and generate */}
          {state === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3">
              <p className="text-[11px] text-zinc-500 font-mono leading-relaxed">
                Agent 06 drafts a message to your team explaining the delay and the rescue plan — so they know what's shipping and when.
              </p>

              {/* Mode toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("slack")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all ${mode === "slack"
                    ? "bg-violet-950/40 border-violet-500/40 text-violet-300"
                    : "bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Slack / Teams
                </button>
                <button
                  type="button"
                  onClick={() => setMode("email")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all ${mode === "email"
                    ? "bg-violet-950/40 border-violet-500/40 text-violet-300"
                    : "bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"}`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
              </div>

              {/* Optional recipient context */}
              <div>
                <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block mb-1">
                  Who to address? <span className="normal-case text-zinc-700">(optional)</span>
                </label>
                <input
                  type="text"
                  value={recipientCtx}
                  onChange={(e) => setRecipientCtx(e.target.value)}
                  placeholder={mode === "slack" ? "e.g. #dev-team, @manager" : "e.g. Professor Smith, project supervisor"}
                  className="w-full bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-mono px-3 py-2 rounded-lg focus:outline-none focus:border-violet-500/50 transition-colors placeholder-zinc-700"
                />
              </div>

              {error && (
                <p className="text-[10px] text-red-400 font-mono">{error}</p>
              )}

              <button
                type="button"
                onClick={handleGenerate}
                className="w-full flex items-center justify-center gap-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 hover:border-violet-500/60 text-violet-300 font-semibold py-3 px-4 rounded-xl transition-all text-sm group"
              >
                <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Draft {mode === "slack" ? "Slack" : "Email"} Update
              </button>
            </motion.div>
          )}

          {/* Loading */}
          {state === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
              <span className="text-xs font-mono text-violet-400">Agent 06 drafting {mode === "slack" ? "Slack" : "email"} update…</span>
            </motion.div>
          )}

          {/* Done — show draft */}
          {state === "done" && draft && (
            <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-3">

              {/* Draft label */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {mode === "slack"
                    ? <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                    : <Mail className="w-3.5 h-3.5 text-violet-400" />}
                  <span className="text-[10px] font-mono text-violet-400 uppercase tracking-wider">
                    {mode === "slack" ? "Slack / Teams Draft" : "Email Draft"}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-zinc-600">Review before sending</span>
              </div>

              {/* Collapsible draft */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={mode === "email" ? 14 : 10}
                      className="w-full bg-zinc-900/60 border border-zinc-800 text-zinc-200 text-xs font-mono px-3 py-3 rounded-xl focus:outline-none focus:border-violet-500/40 transition-colors leading-relaxed resize-y"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold py-2.5 rounded-xl transition-all"
                >
                  {copied
                    ? <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                    : <><Copy className="w-3.5 h-3.5" /><span>Copy {mode === "slack" ? "for Slack" : "Email"}</span></>}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="flex items-center justify-center gap-1.5 bg-zinc-900/40 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-zinc-300 text-xs font-mono py-2.5 px-3 rounded-xl transition-all"
                >
                  <RefreshCw className="w-3 h-3" /> redo
                </button>
              </div>

              <p className="text-[9px] text-zinc-700 font-mono">
                Editable above — tweak tone or details before copying.
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}