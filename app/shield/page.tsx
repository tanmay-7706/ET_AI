"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { RiskBadge, RiskLevel } from "@/components/ui/RiskBadge";
import { ConfidenceRing } from "@/components/ui/ConfidenceRing";
import { ShieldMessage } from "@/lib/mockShieldResponse";

export default function CitizenShieldPage() {
  const [language, setLanguage] = useState<"en" | "hi">("en");
  
  const getInitMessage = (lang: "en" | "hi") => {
    return lang === "en" 
      ? "Hello. I'm your Digital Fraud Shield. Have you received a suspicious call, message, or link? Describe what happened and I'll analyze it for you."
      : "नमस्ते। मैं आपका डिजिटल धोखाधड़ी रक्षक (Fraud Shield) हूँ। क्या आपको कोई संदिग्ध कॉल, संदेश या लिंक मिला है? मुझे बताएं और मैं इसका विश्लेषण करूंगा।";
  };

  const [messages, setMessages] = useState<ShieldMessage[]>(() => [
    {
      id: "init",
      role: "assistant",
      text: getInitMessage("en"),
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

  const handleLanguageToggle = () => {
    const newLang = language === "en" ? "hi" : "en";
    setLanguage(newLang);
    
    // Update the init message if it's the only one, or just let the chat continue
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === "init") {
        return [{ ...prev[0], text: getInitMessage(newLang) }];
      }
      return prev;
    });
  };

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
          language,
        }),
      });

      const data = await res.json();
      
      if (res.status === 429) {
        setMessages((prev) => [...prev, {
          id: `err_${Date.now()}`,
          role: "assistant",
          text: data.message || "Please wait a moment before sending another message.",
          timestamp: Date.now(),
        }]);
        return;
      }

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
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
        text: language === "en" 
          ? "I'm temporarily unable to reach the analysis engine. If this is an emergency or you suspect a scam, please call the National Cyber Crime Helpline at 1930 immediately."
          : "मैं अभी विश्लेषण इंजन तक पहुंचने में असमर्थ हूँ। यदि यह एक आपात स्थिति है या आपको धोखाधड़ी का संदेह है, तो कृपया तुरंत राष्ट्रीय साइबर अपराध हेल्पलाइन 1930 पर कॉल करें।",
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
        <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center p-1 overflow-hidden shadow-lg border border-accent-safe/30">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight">Fraud Shield</h1>
              <p className="text-xs opacity-60 text-accent-safe">Online &bull; AI Agent</p>
            </div>
          </div>
          
          <button 
            onClick={handleLanguageToggle}
            className="flex items-center text-[10px] font-bold bg-white/10 rounded-full overflow-hidden border border-white/20 transition-all hover:bg-white/20"
          >
            <span className={`px-2 py-1 ${language === "en" ? "bg-white text-black" : "text-white/60"}`}>EN</span>
            <span className={`px-2 py-1 ${language === "hi" ? "bg-white text-black" : "text-white/60"}`}>HI</span>
          </button>
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
              placeholder={language === "en" ? "Message Fraud Shield..." : "फ्रॉड शील्ड को संदेश भेजें..."}
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
