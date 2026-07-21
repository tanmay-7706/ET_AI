"use client";
import React from "react";

export interface TickerItem {
  id: string;
  timestamp: string;
  message: string;
  type: "alert" | "info" | "success" | "warning";
}

interface LiveTickerProps {
  items: TickerItem[];
  className?: string;
}

export function LiveTicker({ items, className = "" }: LiveTickerProps) {
  // Derive display items directly from props to avoid cascading renders
  const displayItems = items.slice(0, 5);

  const typeStyles = {
    alert: "text-risk-critical border-risk-critical/30 bg-risk-critical/10",
    info: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    success: "text-accent-safe border-accent-safe/30 bg-accent-safe/10",
    warning: "text-risk-medium border-risk-medium/30 bg-risk-medium/10",
  };

  return (
    <div className={`overflow-hidden relative ${className}`}>
      <div className="flex flex-col gap-2">
        {displayItems.map((item, idx) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-2 border-l-2 rounded-r bg-gradient-to-r to-transparent animate-slide-in-right ${
              typeStyles[item.type]
            }`}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <span className="font-mono text-[10px] opacity-70 whitespace-nowrap mt-1">
              {item.timestamp}
            </span>
            <span className="font-sans text-sm">{item.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
