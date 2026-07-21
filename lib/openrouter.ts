// ═══════════════════════════════════════════════════════════════════
// OpenRouter Multi-Model Routing Client
// ═══════════════════════════════════════════════════════════════════
// Typed client wrapper around the OpenRouter chat completions endpoint.
// Named routing config lets you swap model slugs in one place based
// on availability/affordability at demo time.
// ═══════════════════════════════════════════════════════════════════

/**
 * Model routing configuration.
 * classification: fast/cheap model for high-volume transcript scoring
 * synthesis: stronger reasoning model for grounded Q&A and synthesis
 *
 * Swap these slugs to match what's available on your OpenRouter account.
 */
export const ROUTING = {
  classification: "google/gemini-2.0-flash-001",
  synthesis: "anthropic/claude-sonnet-4",
} as const;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Call the OpenRouter chat completions endpoint with a named model route.
 *
 * Every call has a timeout and graceful fallback — never let a model
 * hiccup crash the Inngest pipeline or a citizen-facing endpoint.
 *
 * @param modelSlug - The OpenRouter model identifier (use ROUTING.xxx)
 * @param messages - The chat messages to send
 * @param timeoutMs - Timeout in milliseconds (default 30s)
 * @returns The model's response text, or null if the call failed
 */
export async function callOpenRouter(
  modelSlug: string,
  messages: ChatMessage[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("[OpenRouter] OPENROUTER_API_KEY is not set");
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://digital-safety-shield.demo",
        "X-Title": "Digital Safety Shield",
      },
      body: JSON.stringify({
        model: modelSlug,
        messages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `[OpenRouter] HTTP ${response.status}: ${await response.text()}`
      );
      return null;
    }

    const data = (await response.json()) as OpenRouterResponse;
    return data.choices?.[0]?.message?.content ?? null;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[OpenRouter] Request timed out after ${timeoutMs}ms`);
    } else {
      console.error("[OpenRouter] Request failed:", error instanceof Error ? error.message : error);
    }
    return null;
  }
}

/**
 * Parse a numeric risk score (0–100) from model output text.
 * Handles cases where the model wraps the number in explanation text.
 * Returns null if no valid number is found.
 */
export function parseRiskScore(text: string): number | null {
  // Try to find a number between 0 and 100 in the text
  const matches = text.match(/\b(\d{1,3})\b/g);
  if (!matches) return null;

  for (const match of matches) {
    const num = parseInt(match, 10);
    if (num >= 0 && num <= 100) {
      return num;
    }
  }
  return null;
}
