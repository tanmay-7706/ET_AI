import { inngest } from "../client";
import { callOpenRouter, ROUTING, parseRiskScore } from "@/lib/openrouter";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * Risk score threshold at which a session is automatically flagged.
 * When a session's cumulative risk score reaches or exceeds this value,
 * the "scam/session.flagged" event is emitted to trigger downstream
 * alert response orchestration.
 */
export const RISK_THRESHOLD = 70;

/**
 * classifyTranscriptChunk
 *
 * Triggered when a new transcript chunk arrives from an active scam session.
 * Responsibilities:
 *   1. Build cumulative transcript context and call OpenRouter classification model.
 *   2. Parse the risk score and reasoning (with retry + fallback for malformed output).
 *   3. Update the session's rolling riskScore, lastReasoning, and append the chunk in
 *      the scamSessions table via a real Convex mutation.
 *   4. If the updated riskScore crosses RISK_THRESHOLD, emit "scam/session.flagged".
 */
export const classifyTranscriptChunk = inngest.createFunction(
  {
    id: "classify-transcript-chunk",
    name: "Classify Transcript Chunk",
  },
  { event: "scam/transcript.chunk.received" },
  async ({ event, step }) => {
    const { sessionId, chunkText, speaker } = event.data;
    const chunkTimestamp = event.data.timestamp ?? Date.now();

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
    const client = new ConvexHttpClient(convexUrl);

    // Step 1: Fetch current session to build cumulative transcript
    const session = await step.run("fetch-session", async () => {
      return await client.query(api.evidence.getSession, { sessionId });
    });

    const priorTranscript = session?.transcriptChunks
      ?.map((c: { speaker: string; text: string }) => `[${c.speaker}]: ${c.text}`)
      .join("\n") ?? "";
    const currentRiskScore = session?.riskScore ?? 0;

    // Step 2: Classify using OpenRouter
    const classificationResult = await step.run(
      "classify-chunk",
      async () => {
        const fullTranscript = priorTranscript
          ? `${priorTranscript}\n[${speaker}]: ${chunkText}`
          : `[${speaker}]: ${chunkText}`;

        const prompt = `You are a fraud detection AI for an Indian law enforcement tool. Analyse the following phone/video call transcript and score the likelihood that this is a scam (specifically a "digital arrest" extortion scam where the caller impersonates law enforcement).

Return a JSON object with exactly two fields:
- "score": an integer from 0 to 100 (0 = clearly safe, 100 = certain scam)
- "reasoning": a brief one-sentence explanation

TRANSCRIPT:
${fullTranscript}

Respond ONLY with the JSON object, no other text.`;

        const response = await callOpenRouter(ROUTING.classification, [
          { role: "system", content: "You are a scam detection classifier. Always respond with valid JSON." },
          { role: "user", content: prompt },
        ]);

        if (response) {
          // Try parsing as JSON first
          try {
            const parsed = JSON.parse(response);
            if (typeof parsed.score === "number" && parsed.score >= 0 && parsed.score <= 100) {
              return {
                chunkRiskScore: parsed.score,
                reasoning: parsed.reasoning || "Score assigned by classification model.",
              };
            }
          } catch {
            // JSON parse failed, try extracting a number
          }

          // Fallback: extract a number from the text
          const score = parseRiskScore(response);
          if (score !== null) {
            return { chunkRiskScore: score, reasoning: response.slice(0, 200) };
          }
        }

        // Retry once with a stricter prompt
        const retryResponse = await callOpenRouter(ROUTING.classification, [
          { role: "system", content: "Return ONLY a single integer between 0 and 100. No other text." },
          { role: "user", content: `Score this call transcript for scam likelihood (0-100): "${chunkText}"` },
        ]);

        if (retryResponse) {
          const retryScore = parseRiskScore(retryResponse);
          if (retryScore !== null) {
            return { chunkRiskScore: retryScore, reasoning: "Score from retry classification." };
          }
        }

        // Safe fallback: don't crash the pipeline
        console.warn("[Classifier] Failed to parse model output, using safe default");
        return { chunkRiskScore: currentRiskScore, reasoning: "Classification unavailable — using prior score." };
      }
    );

    // Step 3: Update the session's riskScore, reasoning, and append chunk in Convex
    const newRiskScore = Math.max(0, Math.min(100, classificationResult.chunkRiskScore));
    const newStatus = newRiskScore >= RISK_THRESHOLD ? "flagged" as const : "monitoring" as const;

    const updatedSession = await step.run(
      "update-session-risk-score",
      async () => {
        return await client.mutation(api.evidence.updateSessionRiskScore, {
          sessionId,
          riskScore: newRiskScore,
          status: newStatus,
          lastReasoning: classificationResult.reasoning,
          newChunk: {
            text: chunkText,
            timestamp: chunkTimestamp,
            speaker,
          },
        });
      }
    );

    // Step 4: If risk threshold crossed, emit flagged event
    if (newRiskScore >= RISK_THRESHOLD) {
      await step.run("emit-session-flagged", async () => {
        await inngest.send({
          name: "scam/session.flagged",
          data: {
            sessionId,
            riskScore: newRiskScore,
            flaggedAt: Date.now(),
          },
        });
      });
    }

    return {
      sessionId,
      newRiskScore,
      wasFlagged: newRiskScore >= RISK_THRESHOLD,
      reasoning: classificationResult.reasoning,
      updatedSession,
    };
  }
);
