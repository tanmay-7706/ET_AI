import React from "react";

interface ConfidenceRingProps {
  score: number; // 0 to 1
  size?: number;
  className?: string;
}

export function ConfidenceRing({ score, size = 48, className = "" }: ConfidenceRingProps) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - score * circumference;
  
  // Determine color based on score threshold (e.g. higher is safe/verified for some contexts, or high confidence in threat)
  // We'll use the safe accent color if score > 0.7, else warning.
  const colorClass = score > 0.7 ? "text-accent-safe stroke-accent-safe" : "text-risk-medium stroke-risk-medium";

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all duration-1000 ease-out ${colorClass}`}
          style={{
            filter: `drop-shadow(0 0 4px currentColor)`,
          }}
        />
      </svg>
      <span className="absolute font-mono text-xs font-bold">
        {Math.round(score * 100)}%
      </span>
    </div>
  );
}
