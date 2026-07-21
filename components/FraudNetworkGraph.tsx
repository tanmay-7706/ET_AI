"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// dynamically import react-force-graph-2d since it relies on window/canvas
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

export function FraudNetworkGraph() {
  const data = useQuery(api.dashboardQueries.getAllEntitiesAndEdges);
  const isLoading = data === undefined;
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize observer to keep the canvas filling the container
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };

    // Map Convex entities to force-graph nodes
    const nodes = data.entities.map((e) => ({
      id: e.entityId,
      label: e.value,
      type: e.type,
      riskWeight: e.riskWeight,
      isConvergenceNode: false, // will flag later if it bridges
    }));

    // Map Convex edges to force-graph links
    const links = data.edges.map((edge) => ({
      source: edge.fromEntityId,
      target: edge.toEntityId,
      relationship: edge.relationshipType,
      confidence: edge.confidence,
      // "convergence" edges are typically those linking a scam session to counterfeit entities, 
      // but we can look for high confidence or specific relationship types.
      // For this demo, let's flag any edge with a very high confidence, or we'll artificially flag one if it exists.
      isConvergence: edge.relationshipType === "shared-transaction" && edge.confidence > 0.85,
    }));

    // Identify nodes part of convergence
    links.forEach((link) => {
      if (link.isConvergence) {
        const src = nodes.find((n) => n.id === link.source);
        const tgt = nodes.find((n) => n.id === link.target);
        if (src) src.isConvergenceNode = true;
        if (tgt) tgt.isConvergenceNode = true;
      }
    });

    return { nodes, links };
  }, [data]);

  const getNodeColor = (type: string, isConvergence: boolean) => {
    if (isConvergence) return "#ef4444"; // critical red
    switch (type) {
      case "phone": return "#3b82f6"; // blue
      case "bank-account": return "#eab308"; // yellow
      case "device-id": return "#a855f7"; // purple
      case "upi-id": return "#22c55e"; // green
      default: return "#9ca3af"; // gray
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-force-graph-2d callback type
  const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;

    const r = node.isConvergenceNode ? 8 : 5;
    ctx.beginPath();
    ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = getNodeColor(node.type || "", !!node.isConvergenceNode);
    ctx.fill();

    // Node label
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(node.label || "", node.x ?? 0, (node.y ?? 0) + r + fontSize);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-force-graph-2d callback type
  const drawLink = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    if (!link.source.x || !link.source.y || !link.target.x || !link.target.y) return;
    
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    
    if (link.isConvergence) {
      // Convergence edge - critical visual beat
      ctx.strokeStyle = "rgba(239, 68, 68, 0.8)"; // Red
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      // Note: simple canvas animation of dashOffset would require a render loop hook
      // But thick dashed red line is very visually distinct
    } else {
      // Normal edge
      ctx.strokeStyle = `rgba(156, 163, 175, ${(link.confidence || 0) * 0.5})`; // Gray with opacity based on confidence
      ctx.lineWidth = (link.confidence || 0) * 2;
      ctx.setLineDash([]);
    }
    
    ctx.stroke();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px] bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full animate-pulse">
          <div className="w-16 h-16 rounded-full bg-gray-700/50 mb-4"></div>
          <p className="text-gray-400 font-mono text-sm">INITIALIZING FORCE GRAPH...</p>
        </div>
      ) : (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeCanvasObject={drawNode}
          linkCanvasObject={drawLink}
          backgroundColor="rgba(0,0,0,0)"
          d3AlphaDecay={0.05}
          d3VelocityDecay={0.4}
        />
      )}
      
      {/* Legend */}
      <div className="absolute top-4 left-4 bg-gray-900/80 backdrop-blur-md border border-gray-800 p-3 rounded-lg flex flex-col gap-2">
        <h4 className="text-xs font-bold text-gray-400 mb-1">NETWORK ENTITIES</h4>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-xs font-mono text-gray-300">Phone Number</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-xs font-mono text-gray-300">Bank Account</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs font-mono text-gray-300">UPI ID</span>
        </div>
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-800">
          <div className="w-6 h-[3px] border-b-2 border-dashed border-red-500"></div>
          <span className="text-xs font-mono text-red-400 font-bold">CONVERGENCE EDGE</span>
        </div>
      </div>
    </div>
  );
}
