import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter, ROUTING } from "@/lib/openrouter";
import { embedText } from "@/lib/embeddings";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { checkRateLimit } from "@/lib/rateLimit";

interface ShieldRequest {
  message: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  language?: "en" | "hi";
}

interface ShieldResponse {
  reply: string;
  verdict: "likely-safe" | "suspicious" | "likely-scam" | "need-more-information";
  confidence: number;
  citedAdvisories: { sourceTitle: string; sourceType: string }[];
}

/**
 * Extract the client IP from Next.js request headers.
 * Falls back to "anonymous" if no IP header is available.
 */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous"
  );
}

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit check (fail fast, before any expensive work) ──
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkRateLimit(clientIp);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message: "Please wait a moment before sending another message.",
        },
        { status: 429 }
      );
    }

    const body = (await req.json()) as ShieldRequest;
    const { message, conversationHistory } = body;
    const language = body.language || "en";

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

    // Language-specific instruction for Hindi responses
    const languageInstruction =
      language === "hi"
        ? `\n\nLANGUAGE INSTRUCTION: You MUST write the "reply" field in Hindi (Devanagari script). The citizen is reading in Hindi. However, keep "verdict" values in English exactly as specified above, and keep "citedAdvisories" source titles in English — only the "reply" text should be in Hindi.`
        : "";

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
}${languageInstruction}`;

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
      const fallbackReply =
        language === "hi"
          ? "मैं अभी आपकी क्वेरी का विश्लेषण करने में असमर्थ हूँ। यदि आपको लगता है कि आप किसी धोखाधड़ी का शिकार हो रहे हैं, तो कृपया तुरंत राष्ट्रीय साइबर अपराध हेल्पलाइन 1930 पर कॉल करें।"
          : "I'm temporarily unable to analyze your query. If you believe you're being targeted by a scam, please call the national cybercrime helpline immediately at 1930.";

      return NextResponse.json<ShieldResponse>({
        reply: fallbackReply,
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
