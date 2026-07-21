"use client";

import React, { useState, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RiskBadge, RiskLevel } from "@/components/ui/RiskBadge";
import { GlassPanel } from "@/components/ui/GlassPanel";

interface AssessmentResult {
  verdict: string;
  confidenceScore: number;
  denomination: string;
  explanation: string;
}

export function CounterfeitUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // We use useAction for the Convex backend call
  const analyzeImage = useAction(api.vision.analyzeCounterfeitImage);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setAssessment(null);
    setIsUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Call Convex action
        const result = await analyzeImage({ imageBase64: base64String });
        setAssessment(result);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  const getRiskLevel = (verdict: string): RiskLevel => {
    switch (verdict) {
      case "likely-counterfeit":
        return "critical";
      case "suspicious":
        return "high";
      case "inconclusive-image-quality":
        return "medium";
      case "likely-genuine":
      default:
        return "low";
    }
  };

  return (
    <GlassPanel className="flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-white/10 pb-2">
        <h2 className="text-sm font-semibold tracking-widest uppercase opacity-70">
          Currency Vision Analysis
        </h2>
        <span className="text-[10px] opacity-50 uppercase tracking-wider">
          AI Visual Assessment (Hackathon Demo)
        </span>
      </div>

      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/20 rounded-lg hover:bg-white/5 transition cursor-pointer relative"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        {previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Local data URL preview */
          <img src={previewUrl} alt="Preview" className="max-h-48 rounded opacity-80 mb-4" />
        ) : (
          <div className="text-center opacity-50 mb-4">
            <p className="mb-2">Drag & Drop or Click to Upload Currency Image</p>
            <p className="text-xs">Supports JPG, PNG</p>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg backdrop-blur-sm">
            <span className="font-mono text-sm animate-pulse">ANALYZING...</span>
          </div>
        )}
      </div>

      {assessment && (
        <div className="mt-4 p-4 bg-black/40 rounded flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="block font-mono text-xs opacity-50 uppercase mb-1">Verdict</span>
              <RiskBadge 
                riskLevel={getRiskLevel(assessment.verdict)} 
                score={assessment.confidenceScore * 100} 
              />
            </div>
            <div className="text-right">
               <span className="block font-mono text-xs opacity-50 uppercase mb-1">Denomination</span>
               <span className="font-bold">{assessment.denomination}</span>
            </div>
          </div>
          
          <div className="text-sm opacity-80 mt-2">
            {assessment.explanation}
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
