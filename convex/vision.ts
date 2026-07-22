"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { classifyNoteImage } from "../lib/agents/counterfeitVision";

/**
 * Convex action to analyze an uploaded counterfeit image via the Gemini Vision Agent.
 */
export const analyzeCounterfeitImage = action({
  args: {
    imageBase64: v.string(),
    serialNumber: v.optional(v.string()), // Optional, could be extracted by vision or provided by user
  },
  handler: async (ctx, args) => {
    // 1. Call the Vision API
    const assessment = await classifyNoteImage(args.imageBase64);

    return assessment;
  },
});
