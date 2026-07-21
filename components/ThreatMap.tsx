"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function ThreatMap() {
  const locations = useQuery(api.dashboardQueries.getActiveComplaintLocations);
  const isLoading = locations === undefined;

  // A very simplified SVG path representing the approximate outline of India.
  // In a real app this would be a proper GeoJSON projection.
  const indiaPath = "M 30,10 L 40,20 L 50,20 L 60,30 L 70,25 L 80,35 L 75,50 L 85,60 L 95,50 L 105,60 L 90,75 L 85,90 L 70,110 L 60,130 L 50,130 L 45,110 L 35,90 L 25,75 L 10,70 L 10,60 L 20,50 L 15,40 L 25,30 Z";

  // Map latitude (approx 8 to 37) and longitude (approx 68 to 97) to the 0-140 SVG coordinates
  // Very rough projection mapping!
  const projectCoordinates = (lat: number, lng: number) => {
    const minLat = 8;
    const maxLat = 37;
    const minLng = 68;
    const maxLng = 97;

    const x = ((lng - minLng) / (maxLng - minLng)) * 100 + 10;
    const y = 130 - ((lat - minLat) / (maxLat - minLat)) * 120;
    return { x, y };
  };

  return (
    <div className="relative w-full h-full min-h-[400px] flex items-center justify-center bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center animate-pulse">
          <div className="w-16 h-16 rounded-full bg-gray-700/50 mb-4"></div>
          <p className="text-gray-400 font-mono text-sm">LOADING SECURE MAP DATA...</p>
        </div>
      ) : (
        <svg
          viewBox="0 0 120 140"
          className="w-full h-full drop-shadow-2xl opacity-90"
          style={{ maxHeight: "500px" }}
        >
          {/* Base Map */}
          <path
            d={indiaPath}
            fill="#111827"
            stroke="#374151"
            strokeWidth="0.5"
            className="transition-all duration-1000"
          />

          {/* Glow effect definitions */}
          <defs>
            <filter id="glow-red">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-purple">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Markers */}
          {locations?.map((loc) => {
            const { x, y } = projectCoordinates(loc.lat, loc.lng);
            const isArrest = loc.type === "digital-arrest";
            const color = isArrest ? "#ef4444" : "#a855f7"; // Red for arrest, Purple for counterfeit
            const filterId = isArrest ? "url(#glow-red)" : "url(#glow-purple)";
            
            // Calculate a severity scale based on arbitrary value (default 1 if not present)
            const scale = isArrest ? 1.5 : 1.2;

            return (
              <g key={loc.locationId} className="group" style={{ transform: `translate(${x}px, ${y}px)` }}>
                {/* Pulsing background ring */}
                <circle
                  cx="0"
                  cy="0"
                  r={2 * scale}
                  fill={color}
                  opacity="0.4"
                  className="animate-ping"
                  style={{ animationDuration: "3s" }}
                />
                
                {/* Solid center dot */}
                <circle
                  cx="0"
                  cy="0"
                  r={1.2 * scale}
                  fill={color}
                  filter={filterId}
                  className="transition-all duration-300 group-hover:r-[2px]"
                />

                {/* SVG-based Tooltip shown on hover */}
                <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <rect
                    x="4"
                    y="-12"
                    width="45"
                    height="18"
                    rx="2"
                    fill="rgba(17, 24, 39, 0.9)"
                    stroke={color}
                    strokeWidth="0.2"
                  />
                  <text
                    x="6"
                    y="-5"
                    fill="#fff"
                    fontSize="4"
                    fontFamily="monospace"
                  >
                    {isArrest ? "DIGITAL ARREST" : "COUNTERFEIT"}
                  </text>
                  <text
                    x="6"
                    y="1"
                    fill="#9ca3af"
                    fontSize="3"
                    fontFamily="monospace"
                  >
                    {loc.locationId || "Unknown Location"}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-md border border-gray-800 p-3 rounded-lg flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
          <span className="text-xs font-mono text-gray-300">Digital Arrest</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
          <span className="text-xs font-mono text-gray-300">Counterfeit Seizure</span>
        </div>
      </div>
    </div>
  );
}
