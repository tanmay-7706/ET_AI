"use client";

import React, { useState, useRef, useEffect } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { RiskBadge, RiskLevel } from "@/components/ui/RiskBadge";
import { ConfidenceRing } from "@/components/ui/ConfidenceRing";
import { ShieldMessage } from "@/lib/mockShieldResponse";

export default function CitizenShieldPage() {
  const [messages, setMessages] = useState<ShieldMessage[]>(() => [
    {
      id: "init",
      role: "assistant",
      text: "Hello. I'm your Digital Fraud Shield. Have you received a suspicious call, message, or link? Describe what happened and I'll analyze it for you.",
      timestamp: Date.now(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userText = inputValue;
    setInputValue("");

    // Add user message
    const userMsg: ShieldMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      text: userText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    
    // Prepare conversation history (exclude the current message)
    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.text
    }));

    setIsTyping(true);
    try {
      // Call the real RAG-grounded backend
      const res = await fetch("/api/shield/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userText,
          conversationHistory,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      
      // Map API verdict ("likely-safe" | "suspicious" | "likely-scam" | "need-more-information") to RiskLevel
      const mapVerdictToLevel = (v: string): RiskLevel => {
        switch(v) {
          case "likely-safe": return "low";
          case "suspicious": return "medium";
          case "likely-scam": return "critical";
          case "need-more-information":
          default: return "medium";
        }
      };

      const assistantMsg: ShieldMessage = {
        id: `ast_${Date.now()}`,
        role: "assistant",
        text: data.reply,
        timestamp: Date.now(),
        verdict: {
          level: mapVerdictToLevel(data.verdict),
          score: data.confidence,
        },
        citedAdvisories: data.citedAdvisories,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
      // Graceful fallback for API failure
      setMessages((prev) => [...prev, {
        id: `err_${Date.now()}`,
        role: "assistant",
        text: "I'm temporarily unable to reach the analysis engine. If this is an emergency or you suspect a scam, please call the National Cyber Crime Helpline at 1930 immediately.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-0 sm:p-4 relative overflow-hidden">
      {/* Warmer background glow for citizen app */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-accent-safe/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Mobile-sized chat container */}
      <GlassPanel className="w-full sm:w-[400px] h-[100dvh] sm:h-[800px] flex flex-col p-0 sm:p-0 overflow-hidden sm:rounded-[2rem] sm:border-2">
        
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-full bg-accent-safe/20 flex items-center justify-center border border-accent-safe/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
            <svg className="w-5 h-5 text-accent-safe" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div>
            <h1 className="font-bold tracking-tight">Fraud Shield</h1>
            <p className="text-xs opacity-60 text-accent-safe">Online &bull; AI Agent</p>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative z-10" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col max-w-[90%] ${msg.role === "user" ? "self-end items-end" : "self-start items-start"}`}>
              <div className={`p-3 rounded-2xl ${msg.role === "user" ? "bg-accent-safe/20 text-white rounded-br-sm border border-accent-safe/30" : "bg-white/5 text-white/90 rounded-bl-sm border border-white/10"}`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                
                {/* Embedded Verdict UI */}
                {msg.verdict && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-3">
                    <ConfidenceRing score={msg.verdict.score} size={40} />
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-mono opacity-50">Analysis Verdict</span>
                      <RiskBadge riskLevel={msg.verdict.level} score={msg.verdict.score * 100} />
                    </div>
                  </div>
                )}

                {/* Sources UI */}
                {msg.citedAdvisories && msg.citedAdvisories.length > 0 && (
                  <div className="mt-2 text-[10px] bg-black/20 p-2 rounded text-white/50 border border-white/5">
                    <span className="block mb-1 opacity-70">Grounded against regulatory sources:</span>
                    <ul className="list-disc pl-3">
                      {msg.citedAdvisories.map((adv, idx) => (
                        <li key={idx}>[{adv.sourceType}] {adv.sourceTitle}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <span className="text-[10px] opacity-40 mt-1 font-mono px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          
          {isTyping && (
            <div className="self-start items-start flex flex-col max-w-[85%]">
               <div className="p-4 rounded-2xl bg-white/5 text-white/90 rounded-bl-sm border border-white/10 flex gap-1 items-center">
                 <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                 <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                 <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
               </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black/20 border-t border-white/10 relative z-10">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Fraud Shield..."
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-accent-safe/50 focus:bg-white/10 transition"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              className="w-11 h-11 rounded-full bg-accent-safe/20 text-accent-safe border border-accent-safe/50 flex items-center justify-center hover:bg-accent-safe/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 -ml-1 mt-1 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
