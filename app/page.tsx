"use client";

import React, { useState, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Shield,
  Radar,
  Network,
  FileText,
  MessageSquare,
  ChevronRight,
  Activity,
  Sun,
  Moon,
  Zap,
  Eye,
} from "lucide-react";

// SSR-safe localStorage reader
function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function getStoredTheme() {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem("dss-theme") || "dark";
}
function getServerTheme() {
  return "dark";
}

export default function LandingPage() {
  const storedTheme = useSyncExternalStore(
    subscribeToStorage,
    getStoredTheme,
    getServerTheme
  );
  const [dark, setDarkState] = useState(storedTheme !== "light");

  const setDark = useCallback((val: boolean) => {
    setDarkState(val);
    document.documentElement.classList.toggle("light-mode", !val);
    localStorage.setItem("dss-theme", val ? "dark" : "light");
  }, []);

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        dark
          ? "bg-[#060913] text-[#e2e8f0]"
          : "bg-[#e0e5ec] text-[#2d3436]"
      }`}
    >
      {/* Noise texture overlay for light mode */}
      {!dark && (
        <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]">
          <svg width="100%" height="100%">
            <filter id="noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.65"
                numOctaves="3"
                stitchTiles="stitch"
              />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
        </div>
      )}

      {/* Background glows */}
      <div
        className={`fixed top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none ${
          dark ? "bg-cyan-500/10" : "bg-[#ff4757]/8"
        }`}
      />
      <div
        className={`fixed bottom-1/4 right-1/4 w-[30rem] h-[30rem] rounded-full blur-[150px] pointer-events-none ${
          dark ? "bg-red-500/10" : "bg-blue-400/8"
        }`}
      />

      {/* ─── Navbar ─── */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-5">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              dark
                ? "bg-cyan-500/20 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                : "bg-[#e0e5ec] shadow-[4px_4px_8px_#babecc,-4px_-4px_8px_#ffffff]"
            }`}
          >
            <Shield
              className={`w-5 h-5 ${
                dark ? "text-cyan-400" : "text-[#ff4757]"
              }`}
            />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight">
              Digital Safety Shield
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  dark
                    ? "bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                    : "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                }`}
              />
              <span
                className={`font-mono text-[9px] uppercase tracking-widest ${
                  dark ? "text-green-400/70" : "text-green-600/70"
                }`}
              >
                System Online
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setDark(!dark)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
            dark
              ? "bg-white/5 border border-white/10 hover:bg-white/10"
              : "bg-[#e0e5ec] shadow-[4px_4px_8px_#babecc,-4px_-4px_8px_#ffffff] hover:shadow-[2px_2px_4px_#babecc,-2px_-2px_4px_#ffffff] active:shadow-[inset_4px_4px_8px_#babecc,inset_-4px_-4px_8px_#ffffff]"
          }`}
          title="Toggle theme"
        >
          {dark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#4a5568]" />
          )}
        </button>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative z-10 px-6 sm:px-12 pt-12 pb-20 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div className="flex flex-col gap-6">
            <div
              className={`inline-flex items-center gap-2 w-fit px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest font-mono ${
                dark
                  ? "bg-red-500/10 text-red-400 border border-red-500/30"
                  : "bg-[#e0e5ec] text-[#ff4757] shadow-[inset_4px_4px_8px_#babecc,inset_-4px_-4px_8px_#ffffff]"
              }`}
            >
              <Zap className="w-3 h-3" />
              ET AI Hackathon 2026 — PS #6
            </div>

            <h1
              className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] ${
                dark
                  ? "text-white"
                  : "text-[#2d3436] drop-shadow-[0_1px_1px_#ffffff]"
              }`}
            >
              Live Scam
              <br />
              Interception &
              <br />
              <span
                className={
                  dark ? "text-cyan-400" : "text-[#ff4757]"
                }
              >
                Convergence
              </span>
              <br />
              Mapping
            </h1>

            <p
              className={`text-base sm:text-lg max-w-lg leading-relaxed ${
                dark ? "text-white/60" : "text-[#4a5568]"
              }`}
            >
              An AI-powered command center that intercepts digital-arrest scams
              in real-time and maps fraud networks to counterfeit currency
              circulation using a shared entity graph.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <Link
                href="/command-center"
                className={`group flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                  dark
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                    : "bg-[#ff4757] text-white border border-[rgba(255,255,255,0.2)] shadow-[4px_4px_8px_rgba(166,50,60,0.4),-4px_-4px_8px_rgba(255,100,110,0.4)] hover:brightness-110 active:translate-y-[2px] active:shadow-[inset_6px_6px_12px_#babecc,inset_-6px_-6px_12px_#ffffff]"
                }`}
              >
                <Radar className="w-4 h-4" />
                Command Center
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/shield"
                className={`group flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                  dark
                    ? "bg-white/5 border border-white/10 hover:bg-white/10 text-white/80"
                    : "bg-[#e0e5ec] text-[#2d3436] shadow-[4px_4px_8px_#babecc,-4px_-4px_8px_#ffffff] hover:shadow-[6px_6px_12px_#babecc,-6px_-6px_12px_#ffffff] active:translate-y-[2px] active:shadow-[inset_4px_4px_8px_#babecc,inset_-4px_-4px_8px_#ffffff]"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Citizen Shield
              </Link>
            </div>
          </div>

          {/* Right: Device Mockup */}
          <div className="flex items-center justify-center">
            <div
              className={`relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden ${
                dark
                  ? "bg-black/60 border-2 border-white/10 shadow-[0_0_40px_rgba(6,182,212,0.1)]"
                  : "bg-[#2d3436] border-4 border-[#4a5568] shadow-[12px_12px_24px_#babecc,-12px_-12px_24px_#ffffff]"
              }`}
            >
              {/* Screen bezel */}
              <div className="absolute inset-2 rounded-xl bg-[#0a0e1a] overflow-hidden">
                {/* Scanlines */}
                <div
                  className="absolute inset-0 z-10 pointer-events-none opacity-10"
                  style={{
                    background:
                      "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%)",
                    backgroundSize: "100% 4px",
                  }}
                />
                {/* Content: Abstract dashboard */}
                <div className="absolute inset-0 p-4 flex flex-col gap-3">
                  {/* Top bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                      <span className="font-mono text-[9px] text-green-400/70 uppercase tracking-widest">
                        Live
                      </span>
                    </div>
                    <span className="font-mono text-[8px] text-white/30">
                      v2.1.0
                    </span>
                  </div>

                  {/* Fake metrics row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: "SESSIONS",
                        value: "12",
                        color: "text-blue-400",
                      },
                      {
                        label: "FLAGGED",
                        value: "3",
                        color: "text-amber-400",
                      },
                      {
                        label: "CONV EDGES",
                        value: "1",
                        color: "text-red-400",
                      },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="bg-white/5 rounded-lg p-2 border border-white/5"
                      >
                        <span className="font-mono text-[7px] text-white/40 uppercase tracking-widest block">
                          {m.label}
                        </span>
                        <span
                          className={`font-mono text-lg font-bold ${m.color}`}
                        >
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Fake graph dots */}
                  <div className="flex-1 relative">
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 200 100"
                      fill="none"
                    >
                      {/* Graph edges */}
                      <line
                        x1="40"
                        y1="30"
                        x2="100"
                        y2="60"
                        stroke="rgba(96,165,250,0.3)"
                        strokeWidth="1"
                      />
                      <line
                        x1="100"
                        y1="60"
                        x2="160"
                        y2="40"
                        stroke="rgba(96,165,250,0.3)"
                        strokeWidth="1"
                      />
                      <line
                        x1="100"
                        y1="60"
                        x2="80"
                        y2="85"
                        stroke="rgba(96,165,250,0.3)"
                        strokeWidth="1"
                      />
                      {/* Convergence edge */}
                      <line
                        x1="40"
                        y1="30"
                        x2="160"
                        y2="40"
                        stroke="rgba(239,68,68,0.6)"
                        strokeWidth="2"
                        strokeDasharray="6 3"
                      />
                      {/* Nodes */}
                      <circle
                        cx="40"
                        cy="30"
                        r="6"
                        fill="rgba(96,165,250,0.8)"
                      />
                      <circle
                        cx="100"
                        cy="60"
                        r="8"
                        fill="rgba(251,191,36,0.8)"
                      />
                      <circle
                        cx="160"
                        cy="40"
                        r="6"
                        fill="rgba(239,68,68,0.8)"
                      />
                      <circle
                        cx="80"
                        cy="85"
                        r="5"
                        fill="rgba(34,197,94,0.6)"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Hardware details */}
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="relative z-10 px-6 sm:px-12 pb-20 max-w-6xl mx-auto">
        <h2
          className={`text-sm font-bold uppercase tracking-[0.08em] font-mono mb-8 ${
            dark ? "text-white/40" : "text-[#4a5568]"
          }`}
        >
          Core Capabilities
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Radar,
              title: "Live Interception",
              desc: "Real-time session analysis that flags threats before financial damage occurs.",
            },
            {
              icon: Network,
              title: "Convergence Graph",
              desc: "Force-directed entity graph connecting digital-arrest scam networks to counterfeit currency hubs.",
            },
            {
              icon: MessageSquare,
              title: "RAG-Grounded Chat",
              desc: "Citizen-facing chatbot grounded in RBI, MHA, and NCRB advisories with visible citations.",
            },
            {
              icon: FileText,
              title: "Evidence Export",
              desc: "Auto-generated court-admissible style dossiers as downloadable PDF packages.",
            },
            {
              icon: Eye,
              title: "Hindi Support",
              desc: "Regional language toggle for citizen-facing interfaces, ensuring nationwide accessibility.",
            },
            {
              icon: Activity,
              title: "Rate-Limited API",
              desc: "Production-grade Upstash Redis sliding-window rate limiting on all public endpoints.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className={`group p-6 rounded-xl transition-all duration-300 ${
                dark
                  ? "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:-translate-y-1"
                  : "bg-[#e0e5ec] shadow-[8px_8px_16px_#babecc,-8px_-8px_16px_#ffffff] hover:shadow-[12px_12px_24px_#babecc,-12px_-12px_24px_#ffffff] hover:-translate-y-1"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6 ${
                  dark
                    ? "bg-white/5 border border-white/10"
                    : "bg-[#e0e5ec] shadow-[4px_4px_8px_#babecc,-4px_-4px_8px_#ffffff]"
                }`}
              >
                <feature.icon
                  className={`w-5 h-5 ${
                    dark ? "text-cyan-400" : "text-[#ff4757]"
                  }`}
                />
              </div>
              <h3
                className={`font-bold mb-2 ${
                  dark ? "" : "drop-shadow-[0_1px_0_#ffffff]"
                }`}
              >
                {feature.title}
              </h3>
              <p
                className={`text-sm leading-relaxed ${
                  dark ? "text-white/50" : "text-[#4a5568]"
                }`}
              >
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA + Disclaimer ─── */}
      <section className="relative z-10 px-6 sm:px-12 pb-16 max-w-6xl mx-auto">
        <div
          className={`rounded-2xl p-8 sm:p-12 text-center ${
            dark
              ? "bg-white/[0.02] border border-white/[0.06]"
              : "bg-[#e0e5ec] shadow-[8px_8px_16px_#babecc,-8px_-8px_16px_#ffffff]"
          }`}
        >
          <h2
            className={`text-2xl sm:text-3xl font-bold mb-3 ${
              dark ? "" : "drop-shadow-[0_1px_0_#ffffff]"
            }`}
          >
            Ready to explore?
          </h2>
          <p
            className={`text-sm max-w-xl mx-auto mb-6 ${
              dark ? "text-white/50" : "text-[#4a5568]"
            }`}
          >
            Start a live demo scenario in the Command Center, or test the
            citizen chatbot in Hindi and English.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/command-center"
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                dark
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30"
                  : "bg-[#ff4757] text-white shadow-[4px_4px_8px_rgba(166,50,60,0.4),-4px_-4px_8px_rgba(255,100,110,0.4)] active:translate-y-[2px]"
              }`}
            >
              <Radar className="w-4 h-4" />
              Officer Command Center
            </Link>
            <Link
              href="/shield"
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                dark
                  ? "bg-white/5 border border-white/10 hover:bg-white/10 text-white/70"
                  : "bg-[#e0e5ec] text-[#2d3436] shadow-[4px_4px_8px_#babecc,-4px_-4px_8px_#ffffff] active:translate-y-[2px] active:shadow-[inset_4px_4px_8px_#babecc,inset_-4px_-4px_8px_#ffffff]"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Citizen Shield Chat
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <div
          className={`mt-8 text-center text-[10px] font-mono uppercase tracking-widest leading-relaxed ${
            dark ? "text-white/20" : "text-[#4a5568]/50"
          }`}
        >
          Hackathon prototype — simulated data only — not connected to real
          law-enforcement or banking systems.
          <br />
          Built for ET AI Hackathon 2026 by{" "}
          <a
            href="https://github.com/tanmay-7706"
            className={`underline ${
              dark ? "hover:text-white/40" : "hover:text-[#ff4757]"
            }`}
          >
            Tanmay Singh
          </a>
        </div>
      </section>
    </div>
  );
}
