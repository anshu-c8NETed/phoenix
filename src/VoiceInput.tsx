// ════════════════════════════════════════════════════════════
//  Phoenix — Voice Input
//  Mic button using Web Speech API (SpeechRecognition).
//  Works in Chrome/Edge natively — no API key needed.
//  Two modes:
//    "goal"     → single sentence, replaces goal input
//    "features" → multi-line, appends items one per line
// ════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Square } from "lucide-react";

interface VoiceInputProps {
  mode: "goal" | "features";
  onResult: (text: string) => void;
  disabled?: boolean;
}

// Extend window for browser SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceInput({ mode, onResult, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
  }, []);

  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    setError(null);
    setTranscript("");

    const recognition = new SR();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = mode === "features"; // continuous for features, single for goal
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (e: any) => {
      let interim = "";
      let final = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }

      setTranscript(interim || final);

      if (final && mode === "goal") {
        // For goal: take first final result, clean it up, done
        const cleaned = final.trim().replace(/\.$/, "");
        onResult(cleaned);
        recognition.stop();
      }

      if (final && mode === "features") {
        // For features: each sentence becomes a new line
        const lines = final
          .split(/[,.\n]+/)
          .map((s: string) => s.trim())
          .filter(Boolean);
        if (lines.length) onResult(lines.join("\n"));
      }
    };

    recognition.onerror = (e: any) => {
      // "network" fires as a Chrome cleanup call after the result already
      // landed — safe to ignore since the transcript was already delivered.
      if (e.error === "network") return;
      if (e.error === "no-speech") {
        setError("No speech detected — try again.");
      } else if (e.error === "not-allowed") {
        setError("Microphone access denied. Allow mic in browser settings.");
      } else {
        setError(`Error: ${e.error}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setTranscript("");
    };

    recognition.start();
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  if (!supported) return null; // silently hide on unsupported browsers

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled}
        whileTap={{ scale: 0.92 }}
        title={listening ? "Stop recording" : `Speak your ${mode === "goal" ? "goal" : "features"}`}
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
          ${listening
            ? "bg-red-500/20 border border-red-500/60 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
            : "bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
          } disabled:opacity-40 disabled:pointer-events-none`}
      >
        <AnimatePresence mode="wait">
          {listening ? (
            <motion.div key="stop"
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.15 }}>
              <Square className="w-3.5 h-3.5 fill-red-400 text-red-400" />
            </motion.div>
          ) : (
            <motion.div key="mic"
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.15 }}>
              <Mic className="w-3.5 h-3.5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Listening indicator + live transcript */}
      <AnimatePresence>
        {listening && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-10 z-50 w-56 bg-zinc-900 border border-red-500/30 rounded-xl p-3 shadow-xl shadow-black/40"
          >
            {/* Pulsing dot */}
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">
                {mode === "goal" ? "Listening for goal…" : "Listening — speak items…"}
              </span>
            </div>

            {/* Live transcript preview */}
            {transcript ? (
              <p className="text-[11px] text-zinc-300 font-mono leading-relaxed line-clamp-3 italic">
                "{transcript}"
              </p>
            ) : (
              <p className="text-[10px] text-zinc-600 font-mono">
                {mode === "goal"
                  ? "Say your goal clearly…"
                  : "Say items separated by commas…"}
              </p>
            )}

            <button
              type="button"
              onClick={stop}
              className="mt-2 w-full text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-1"
            >
              <Square className="w-2.5 h-2.5" /> stop recording
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setError(null), 3000)}
            className="absolute right-0 top-10 z-50 w-56 bg-red-950/80 border border-red-500/30 rounded-xl px-3 py-2 shadow-xl"
          >
            <p className="text-[10px] font-mono text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}