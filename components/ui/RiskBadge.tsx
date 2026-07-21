import React from "react";

export type RiskLevel = "low" | "medium" | "high" | "critical";

interface RiskBadgeProps {
  riskLevel: RiskLevel;
  score?: number;
  className?: string;
}

const levelColors = {
  low: "bg-risk-low/20 text-risk-low border-risk-low/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]",
  medium: "bg-risk-medium/20 text-risk-medium border-risk-medium/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]",
  high: "bg-risk-high/20 text-risk-high border-risk-high/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]",
  critical: "bg-risk-critical/20 text-risk-critical border-risk-critical/50 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
};

export function RiskBadge({ riskLevel, score, className = "" }: RiskBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border font-mono tracking-wide ${levelColors[riskLevel]} ${className}`}
    >
      <span className="uppercase tracking-wider font-sans font-bold">
        {riskLevel}
      </span>
      {score !== undefined && (
        <>
          <span className="opacity-50">|</span>
          <span>{score.toFixed(1)}</span>
        </>
      )}
    </span>
  );
}
