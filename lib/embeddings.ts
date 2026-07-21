import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Single chokepoint for all embedding generation across the project.
 * Uses Gemini's text-embedding-004 model (768 dimensions).
 *
 * Every place that needs an embedding calls this one function — makes
 * it a one-line swap if you change embedding providers later.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: text,
  });

  if (!response.embeddings || response.embeddings.length === 0) {
    throw new Error("No embeddings returned from Gemini text-embedding-004");
  }

  return response.embeddings[0].values as number[];
}
