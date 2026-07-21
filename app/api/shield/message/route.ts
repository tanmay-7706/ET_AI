import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter, ROUTING } from "@/lib/openrouter";
import { embedText } from "@/lib/embeddings";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

interface ShieldRequest {
  message: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
}

interface ShieldResponse {
  reply: string;
  verdict: "likely-safe" | "suspicious" | "likely-scam" | "need-more-information";
  confidence: number;
  citedAdvisories: { sourceTitle: string; sourceType: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ShieldRequest;
    const { message, conversationHistory } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid message" },
        { status: 400 }
      );
    }

    // 1. Embed the user's message for RAG retrieval
    let advisories: { sourceTitle: string; sourceType: string; chunkText: string }[] = [];
    try {
      const embedding = await embedText(message);
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (convexUrl) {
        const client = new ConvexHttpClient(convexUrl);
        advisories = await client.action(api.advisories.searchAdvisories, {
          queryEmbedding: embedding,
          topK: 3,
        });
      }
    } catch (e) {
      console.warn("[Shield] RAG retrieval failed, continuing without grounding:", e);
    }

    // 2. Build the grounded prompt
    const advisoryContext = advisories.length > 0
      ? advisories
          .map(
            (a, i) =>
              `[Advisory ${i + 1} — ${a.sourceType}: ${a.sourceTitle}]\n${a.chunkText}`
          )
          .join("\n\n")
      : "No specific advisories found. Use general fraud awareness knowledge.";

    const systemPrompt = `You are the Citizen Fraud Shield — an AI assistant that helps Indian citizens identify scams and protect themselves from fraud.

IMPORTANT RULES:
- You MUST base your answers ONLY on the following retrieved advisory content. Do not invent guidance.
- If the advisories don't cover the citizen's question, say so honestly and recommend contacting the cybercrime helpline (1930).
- Be warm, clear, and reassuring — the citizen may be distressed.
- Always cite which advisory your answer draws from.

RETRIEVED ADVISORY CONTENT:
${advisoryContext}

You MUST respond with a JSON object containing exactly these fields:
{
  "reply": "Your helpful response to the citizen (2-4 sentences)",
  "verdict": "likely-safe" | "suspicious" | "likely-scam" | "need-more-information",
  "confidence": 0.0 to 1.0,
  "citedAdvisories": [{"sourceTitle": "...", "sourceType": "..."}]
}`;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory.slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // 3. Call the synthesis model via OpenRouter
    const rawResponse = await callOpenRouter(ROUTING.synthesis, chatMessages);

    if (!rawResponse) {
      // Graceful fallback when the model is unavailable
      return NextResponse.json<ShieldResponse>({
        reply:
          "I'm temporarily unable to analyze your query. If you believe you're being targeted by a scam, please call the national cybercrime helpline immediately at 1930.",
        verdict: "need-more-information",
        confidence: 0,
        citedAdvisories: [],
      });
    }

    // 4. Parse the response
    try {
      const cleaned = rawResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleaned) as ShieldResponse;

      // Validate verdict literal
      const validVerdicts = ["likely-safe", "suspicious", "likely-scam", "need-more-information"];
      if (!validVerdicts.includes(parsed.verdict)) {
        parsed.verdict = "need-more-information";
      }

      // Clamp confidence
      parsed.confidence = Math.max(0, Math.min(1, parsed.confidence || 0));

      return NextResponse.json<ShieldResponse>(parsed);
    } catch {
      // Model returned non-JSON — wrap the raw text as a reply
      return NextResponse.json<ShieldResponse>({
        reply: rawResponse.slice(0, 500),
        verdict: "need-more-information",
        confidence: 0.5,
        citedAdvisories: advisories.map((a) => ({
          sourceTitle: a.sourceTitle,
          sourceType: a.sourceType,
        })),
      });
    }
  } catch (error: unknown) {
    console.error("[Shield API] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
