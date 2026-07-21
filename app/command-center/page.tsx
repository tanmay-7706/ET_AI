"use client";

import React from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ConfidenceRing } from "@/components/ui/ConfidenceRing";
import { LiveTicker, TickerItem } from "@/components/ui/LiveTicker";
import { ThreatMap } from "@/components/ThreatMap";
import { FraudNetworkGraph } from "@/components/FraudNetworkGraph";
import { DemoControlPanel } from "@/components/DemoControlPanel";
import { ImpactMetricsPanel } from "@/components/ImpactMetricsPanel";
import { HelpCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function CommandCenterPage() {
  const recentAlerts = useQuery(api.dashboardQueries.getRecentAlerts, { limit: 10 });
  const activeSessions = useQuery(api.dashboardQueries.getActiveSessions);

  // Map Convex evidencePackages to TickerItem
  const liveLog: TickerItem[] = recentAlerts
    ? recentAlerts.map((pkg) => ({
        id: pkg.packageId,
        timestamp: new Date(pkg.createdAt).toLocaleTimeString(),
        message: `Evidence package ${pkg.packageId} created. Confidence: ${(pkg.confidenceScore * 100).toFixed(0)}%. ${pkg.status.toUpperCase()}`,
        type: pkg.confidenceScore > 0.8 ? "alert" : pkg.confidenceScore > 0.5 ? "warning" : "info",
      }))
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 overflow-hidden relative">
      <DemoControlPanel />

      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-risk-low/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-risk-critical/10 rounded-full blur-[150px] pointer-events-none" />

      <header className="mb-8 flex justify-between items-end relative z-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Command Center</h1>
          <p className="text-sm opacity-60 font-mono">Digital Public Safety Shield // ACTIVE</p>
        </div>
        <div className="flex items-center gap-4">
          <RiskBadge riskLevel="critical" score={92.5} />
          <span className="font-mono text-xs opacity-50 block">SYSTEM STATUS: ELEVATED</span>
        </div>
      </header>

      <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
        <ImpactMetricsPanel />
      </div>

      <main className="grid grid-cols-1 xl:grid-cols-4 gap-6 relative z-10">
        {/* Left/Center Columns: Visualizations & Sessions */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
            {/* Threat Map */}
            <GlassPanel className="p-0 overflow-hidden relative flex flex-col">
              <div className="p-4 border-b border-white/10 shrink-0">
                <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70">Live Threat Map</h2>
              </div>
              <div className="flex-1 relative">
                <ThreatMap />
              </div>
            </GlassPanel>

            {/* Network Graph */}
            <GlassPanel className="p-0 overflow-hidden relative flex flex-col">
              <div className="p-4 border-b border-white/10 shrink-0">
                <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70">Convergence Network</h2>
              </div>
              <div className="flex-1 relative">
                <FraudNetworkGraph />
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className="flex-1 min-h-[300px] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
            <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-4 border-b border-white/10 pb-2">Active Scam Sessions</h2>
            <div className="flex flex-col gap-3">
              {activeSessions === undefined ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-12 bg-white/5 rounded border border-white/5"></div>
                  <div className="h-12 bg-white/5 rounded border border-white/5"></div>
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="text-center py-8 text-white/30 font-mono text-sm">NO ACTIVE SESSIONS</div>
              ) : (
                activeSessions.map((session) => (
                  <div key={session._id} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-white/50">ID: {session.sessionId}</span>
                        
                        {/* Classifier Reasoning Tooltip */}
                        {session.lastReasoning && (
                          <div className="relative group flex items-center">
                            <HelpCircle 
                              key={session.updatedAt}
                              className="w-3.5 h-3.5 text-white/30 hover:text-white cursor-help transition-colors" 
                            />
                            {/* Subtle flash indicator on update */}
                            <div 
                              key={`ping-${session.updatedAt}`}
                              className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-0 duration-1000"
                              style={{ animationIterationCount: 1, animationFillMode: "forwards" }}
                            />
                            
                            <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-xs shadow-2xl">
                              <span className="font-semibold text-white/90 block mb-1">AI Reasoning:</span>
                              <span className="text-white/70 italic leading-relaxed">{session.lastReasoning}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <span className="font-medium flex items-center gap-2">
                        {session.status.toUpperCase()}
                        {session.riskScore > 70 && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <RiskBadge 
                        riskLevel={session.riskScore > 70 ? "critical" : session.riskScore > 40 ? "medium" : "low"} 
                        score={session.riskScore} 
                      />
                      <button className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1.5 rounded transition">
                        Monitor
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassPanel>
        </div>

        {/* Right Column: Action Log */}
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-700 delay-500 fill-mode-both">
          <GlassPanel className="h-full flex flex-col max-h-[850px]">
            <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-4 border-b border-white/10 pb-2">Live Action Log</h2>
            {recentAlerts === undefined ? (
               <div className="animate-pulse space-y-3 flex-1">
                 <div className="h-16 bg-white/5 rounded border-l-2 border-white/10"></div>
                 <div className="h-16 bg-white/5 rounded border-l-2 border-white/10"></div>
               </div>
            ) : (
              <LiveTicker items={liveLog} className="flex-1" />
            )}
            
            {/* Added a confidence ring at the bottom of the log for the overall system state */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <h3 className="text-xs font-semibold tracking-widest uppercase opacity-50 mb-4 text-center">System Threat Confidence</h3>
              <div className="flex justify-center">
                 <ConfidenceRing score={liveLog.length > 0 ? 0.88 : 0.12} size={140} />
              </div>
            </div>
          </GlassPanel>
        </div>
      </main>
    </div>
  );
}
