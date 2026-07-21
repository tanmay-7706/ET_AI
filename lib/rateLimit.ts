// ═══════════════════════════════════════════════════════════════════
// Rate Limiter — Upstash Redis Sliding Window
// ═══════════════════════════════════════════════════════════════════
// Wraps @upstash/ratelimit with a fail-open strategy: if Upstash
// env vars are missing, all requests are allowed through with a
// console warning. A missing rate-limit config should never take
// down the citizen shield during a live demo.
// ═══════════════════════════════════════════════════════════════════

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Sliding-window rate limiter: 10 requests per 60-second window per IP.
 *
 * Returns null if Upstash is not configured (fail-open).
 */
function createRateLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "[RateLimit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — rate limiting disabled (fail-open)"
    );
    return null;
  }

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: false,
    prefix: "shield_rl",
  });
}

// Singleton — created once on module load
const rateLimiter = createRateLimiter();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check rate limit for a given IP identifier.
 *
 * If Upstash is not configured, always returns allowed: true (fail-open).
 */
export async function checkRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  if (!rateLimiter) {
    return { allowed: true, remaining: 10, resetMs: 0 };
  }

  const result = await rateLimiter.limit(identifier);
  return {
    allowed: result.success,
    remaining: result.remaining,
    resetMs: result.reset,
  };
}
