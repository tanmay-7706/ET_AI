import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

export type VisionVerdict =
  | "likely-genuine"
  | "suspicious"
  | "likely-counterfeit"
  | "inconclusive-image-quality";

export interface CounterfeitAssessment {
  denomination: string;
  visibleFeatures: {
    feature: string;
    present: boolean;
    notes: string;
  }[];
  verdict: VisionVerdict;
  confidenceScore: number;
  explanation: string;
}

/**
 * Counterfeit Vision Agent
 * 
 * Assesses a base64 currency image for visible signs of forgery using Gemini's vision capabilities.
 * Important: This is a visual plausibility assessment for a hackathon prototype, not a certified forensic determination.
 * 
 * @param imageBase64 The base64 string of the uploaded image
 * @returns A structured JSON assessment
 */
export async function classifyNoteImage(imageBase64: string): Promise<CounterfeitAssessment> {
  // Strip data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const prompt = `
    You are an AI assistant performing a visual plausibility assessment of a currency note image for a hackathon prototype.
    This is NOT a certified forensic determination. You cannot perform UV/ML-specific hardware analysis from a photo.
    
    Assess the provided currency note image for:
    1. Apparent denomination.
    2. Visible security features present or absent (e.g., microprint clarity, security thread continuity, watermark presence). Only describe what is visually assessable from a photograph.
    3. An overall confidence verdict.

    You must respond ONLY with a strictly formatted JSON object matching the following schema. Do not wrap the JSON in markdown blocks.
    
    {
      "denomination": "string (e.g. '500 INR')",
      "visibleFeatures": [
        {
          "feature": "string (name of feature)",
          "present": boolean,
          "notes": "string (brief visual observation)"
        }
      ],
      "verdict": "likely-genuine" | "suspicious" | "likely-counterfeit" | "inconclusive-image-quality",
      "confidenceScore": number (0.0 to 1.0),
      "explanation": "string (reasoning for the verdict, acknowledging the limitations of photo-based analysis)"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg", // Defaulting to jpeg for generic base64 handling
          },
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("No response text from Gemini.");
    }

    // Parse and validate the response
    const jsonStr = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(jsonStr) as CounterfeitAssessment;

    // Ensure verdict matches literal types
    if (!["likely-genuine", "suspicious", "likely-counterfeit", "inconclusive-image-quality"].includes(result.verdict)) {
        result.verdict = "inconclusive-image-quality";
    }

    return result;
  } catch (error) {
    console.error("Gemini Vision API error:", error);
    return {
      denomination: "Unknown",
      visibleFeatures: [],
      verdict: "inconclusive-image-quality",
      confidenceScore: 0,
      explanation: "Failed to parse AI response or an API error occurred.",
    };
  }
}
