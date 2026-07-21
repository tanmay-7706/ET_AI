import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Test: Rate limit 429 response shape.
 *
 * We mock the checkRateLimit function to return { allowed: false }
 * and verify the shield endpoint returns the expected 429 JSON body.
 */
describe("Shield Rate Limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });
  it("returns 429 with correct JSON shape when rate limit is exceeded", async () => {
    // Mock the rate limiter to deny the request
    vi.doMock("@/lib/rateLimit", () => ({
      checkRateLimit: vi.fn().mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetMs: Date.now() + 60000,
      }),
    }));

    // Dynamically import the route after mocking
    const { POST } = await import(
      "@/app/api/shield/message/route"
    );

    // Build a minimal NextRequest-like object
    const req = new Request("http://localhost:3000/api/shield/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
      body: JSON.stringify({
        message: "Is this a scam?",
        conversationHistory: [],
      }),
    });

    const response = await POST(req as never);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({
      error: "rate_limited",
      message: "Please wait a moment before sending another message.",
    });

    vi.restoreAllMocks();
  });
});
