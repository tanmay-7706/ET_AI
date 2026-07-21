import React, { useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Helper hook for animating numbers
function useCountUp(endValue: number, durationMs = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressRatio = Math.min(progress / durationMs, 1);
      
      // Easing out quint for smooth deceleration
      const easeOutQuint = 1 - Math.pow(1 - progressRatio, 5);
      setCount(Math.floor(easeOutQuint * endValue));

      if (progressRatio < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [endValue, durationMs]);

  return count;
}

// Formats INR values to Lakhs or Crores for the Indian audience
function formatINR(value: number) {
  if (value >= 1_00_00_000) {
    return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (value >= 1_00_000) {
    return `₹${(value / 1_00_000).toFixed(2)} Lakhs`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

export function ImpactMetricsPanel() {
  const metrics = useQuery(api.dashboardQueries.getImpactMetrics);

  const totalSessionsMonitored = useCountUp(metrics?.totalSessionsMonitored || 0);
  const sessionsFlaggedOrConfirmed = useCountUp(metrics?.sessionsFlaggedOrConfirmed || 0);
  const convergenceLinksDetected = useCountUp(metrics?.convergenceLinksDetected || 0);
  const advisoriesConsultedCount = useCountUp(metrics?.advisoriesConsultedCount || 0);
  const estimatedPreventedLoss = useCountUp(metrics?.estimatedPreventedLoss || 0);

  return (
    <GlassPanel className="p-6 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Secondary Metrics */}
        <div className="flex flex-wrap md:flex-nowrap gap-6 md:gap-10 order-2 md:order-1 flex-1 w-full justify-around md:justify-start">
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-widest uppercase opacity-50 mb-1">Sessions Monitored</span>
            <span className="text-2xl font-bold font-mono">{totalSessionsMonitored}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-widest uppercase opacity-50 mb-1">Flagged / Confirmed</span>
            <span className="text-2xl font-bold font-mono text-amber-400">{sessionsFlaggedOrConfirmed}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-widest uppercase opacity-50 mb-1">Convergence Links</span>
            <span className="text-2xl font-bold font-mono text-blue-400">{convergenceLinksDetected}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-widest uppercase opacity-50 mb-1">Advisories Used</span>
            <span className="text-2xl font-bold font-mono text-green-400">{advisoriesConsultedCount}</span>
          </div>
        </div>

        {/* Primary Metric: Estimated Prevented Loss */}
        <div className="order-1 md:order-2 flex flex-col items-center md:items-end text-center md:text-right md:pl-8 md:border-l border-white/10 shrink-0">
          <span className="text-xs font-semibold tracking-widest uppercase opacity-50 mb-2">Estimated Prevented Loss</span>
          <span className="text-4xl md:text-5xl font-extrabold tracking-tight text-emerald-400 drop-shadow-md">
            {formatINR(estimatedPreventedLoss)}
          </span>
          <span className="text-[10px] opacity-40 mt-2 max-w-[200px] leading-tight">
            *Illustrative estimate based on flagged session volume
          </span>
        </div>

      </div>
    </GlassPanel>
  );
}
