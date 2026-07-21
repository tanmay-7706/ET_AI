"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { classifyNoteImage } from "../lib/agents/counterfeitVision";
import { inngest } from "../inngest/client";

/**
 * Convex action to analyze an uploaded counterfeit image via the Gemini Vision Agent.
 * If the verdict is suspicious or likely-counterfeit, it emits an Inngest event
 * to flow into the graph correlation pipeline.
 */
export const analyzeCounterfeitImage = action({
  args: {
    imageBase64: v.string(),
    serialNumber: v.optional(v.string()), // Optional, could be extracted by vision or provided by user
  },
  handler: async (ctx, args) => {
    // 1. Call the Vision API
    const assessment = await classifyNoteImage(args.imageBase64);

    // 2. If it's a threat, trigger the entity detection pipeline
    if (assessment.verdict === "suspicious" || assessment.verdict === "likely-counterfeit") {
      
      // Use provided serial number or generate a generic one for the demo
      const noteSerial = args.serialNumber || `UNKNOWN_SERIAL_${Date.now()}`;
      
      try {
        await inngest.send({
          name: "entity/mention.detected",
          data: {
            entityType: "currencyNoteSerial",
            entityValue: noteSerial,
            sourceEventId: `vision_upload_${Date.now()}`,
            relatedEntityIds: [], // Could link to the user's entity ID if authenticated
          },
        });
      } catch (e) {
        console.error("Failed to emit Inngest event:", e);
      }
    }

    return assessment;
  },
});
