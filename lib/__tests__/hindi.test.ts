import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Test: Hindi language request produces a prompt containing Hindi instruction.
 *
 * We mock OpenRouter and the rate limiter, then confirm the system prompt
 * includes the Hindi language instruction when language: "hi" is sent.
 */
describe("Shield Hindi Language Support", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });
  it("includes Hindi instruction in the prompt when language is 'hi'", async () => {
    // Track the messages passed to callOpenRouter
    let capturedMessages: { role: string; content: string }[] = [];

    // Mock dependencies
    vi.doMock("@/lib/rateLimit", () => ({
      checkRateLimit: vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetMs: 0,
      }),
    }));

    vi.doMock("@/lib/openrouter", () => ({
      ROUTING: { synthesis: "test-model" },
      callOpenRouter: vi.fn().mockImplementation((_model: string, messages: { role: string; content: string }[]) => {
        capturedMessages = messages;
        return Promise.resolve(JSON.stringify({
          reply: "यह एक परीक्षण उत्तर है।",
          verdict: "need-more-information",
          confidence: 0.5,
          citedAdvisories: [],
        }));
      }),
    }));

    vi.doMock("@/lib/embeddings", () => ({
      embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    }));

    // Mock Convex client — prevent actual calls
    vi.doMock("convex/browser", () => ({
      ConvexHttpClient: vi.fn().mockImplementation(() => ({
        action: vi.fn().mockResolvedValue([]),
      })),
    }));

    const { POST } = await import("@/app/api/shield/message/route");

    const req = new Request("http://localhost:3000/api/shield/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
      body: JSON.stringify({
        message: "क्या यह एक स्कैम है?",
        conversationHistory: [],
        language: "hi",
      }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(200);

    // Verify the system prompt contains the Hindi instruction
    const systemMessage = capturedMessages.find((m) => m.role === "system");
    expect(systemMessage).toBeDefined();
    expect(systemMessage!.content).toContain("LANGUAGE INSTRUCTION");
    expect(systemMessage!.content).toContain("Hindi");
    expect(systemMessage!.content).toContain("Devanagari");

    vi.restoreAllMocks();
  });

  it("does NOT include Hindi instruction when language is 'en' or omitted", async () => {
    vi.doMock("@/lib/rateLimit", () => ({
      checkRateLimit: vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetMs: 0,
      }),
    }));

    let capturedMessages: { role: string; content: string }[] = [];

    vi.doMock("@/lib/openrouter", () => ({
      ROUTING: { synthesis: "test-model" },
      callOpenRouter: vi.fn().mockImplementation((_model: string, messages: { role: string; content: string }[]) => {
        capturedMessages = messages;
        return Promise.resolve(JSON.stringify({
          reply: "This is a test.",
          verdict: "likely-safe",
          confidence: 0.8,
          citedAdvisories: [],
        }));
      }),
    }));

    vi.doMock("@/lib/embeddings", () => ({
      embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    }));

    vi.doMock("convex/browser", () => ({
      ConvexHttpClient: vi.fn().mockImplementation(() => ({
        action: vi.fn().mockResolvedValue([]),
      })),
    }));

    const { POST } = await import("@/app/api/shield/message/route");

    const req = new Request("http://localhost:3000/api/shield/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
      body: JSON.stringify({
        message: "Is this a scam?",
        conversationHistory: [],
        // language omitted — defaults to "en"
      }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(200);

    const systemMessage = capturedMessages.find((m) => m.role === "system");
    expect(systemMessage).toBeDefined();
    expect(systemMessage!.content).not.toContain("LANGUAGE INSTRUCTION");

    vi.restoreAllMocks();
  });
});
