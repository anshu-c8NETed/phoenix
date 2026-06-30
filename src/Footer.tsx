import React from "react";

export default function Footer() {
  return (
    <footer className="relative mt-20 border-t" style={{ borderColor: "rgba(244,244,245,0.06)" }}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-12 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono text-xs" style={{ color: "rgba(244,244,245,0.35)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#F97316" }} />
            <span>Phoenix · 6 AI Agents · Gemini Powered</span>
          </div>

          <div className="flex items-center gap-5 font-mono text-xs">
            <a
              href="https://github.com/anshu-c8NETed/phoenix"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: "rgba(244,244,245,0.4)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F4F4F5")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(244,244,245,0.4)")}
            >
              GitHub ↗
            </a>
            <span style={{ color: "rgba(244,244,245,0.15)" }}>·</span>
            <a
              href="https://portfolio-by-ar.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: "rgba(244,244,245,0.4)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F97316")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(244,244,245,0.4)")}
            >
              Made by A.R
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}