/**
 * Hybrid rate limiter: Upstash Redis when configured, in-memory fallback.
 * Upstash works across Vercel serverless invocations; in-memory is dev-only.
 *
 * Required env for Redis mode:
 *   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/* ===== Types ===== */
interface RateLimitConfig {
  limit: number;
  windowSec: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/* ===== Upstash Redis (production) ===== */
const redisUrl = (process.env.UPSTASH_REDIS_REST_URL ?? "").trim();
const redisToken = (process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim();
const useRedis = !!(redisUrl && redisToken);

const redisLimiters = new Map<string, Ratelimit>();

function getRedisLimiter(config: RateLimitConfig): Ratelimit {
  const cacheKey = `${config.limit}:${config.windowSec}`;
  let limiter = redisLimiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: new Redis({ url: redisUrl, token: redisToken }),
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSec} s`),
      analytics: false,
      prefix: "f9os",
    });
    redisLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

/* ===== In-memory fallback (dev / no Redis) ===== */
interface BucketEntry {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, BucketEntry>();

if (typeof globalThis !== "undefined") {
  // Clean stale entries every 5 min (only in long-running processes)
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      if (now - entry.lastRefill > 10 * 60 * 1000) buckets.delete(key);
    }
  }, 5 * 60 * 1000);
}

function checkMemoryLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry) {
    buckets.set(key, { tokens: config.limit - 1, lastRefill: now });
    return { allowed: true, remaining: config.limit - 1, retryAfterSec: 0 };
  }

  const elapsed = (now - entry.lastRefill) / 1000;
  const refillRate = config.limit / config.windowSec;
  entry.tokens = Math.min(config.limit, entry.tokens + elapsed * refillRate);
  entry.lastRefill = now;

  if (entry.tokens >= 1) {
    entry.tokens -= 1;
    return { allowed: true, remaining: Math.floor(entry.tokens), retryAfterSec: 0 };
  }

  const retryAfterSec = Math.ceil((1 - entry.tokens) / refillRate);
  return { allowed: false, remaining: 0, retryAfterSec };
}

/* ===== Public API ===== */

/**
 * Check rate limit. Uses Upstash Redis in production, in-memory in dev.
 * Async because Redis calls are async; in-memory resolves instantly.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = { limit: 15, windowSec: 60 },
): Promise<RateLimitResult> {
  if (useRedis) {
    try {
      const limiter = getRedisLimiter(config);
      const result = await limiter.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
        retryAfterSec: result.success ? 0 : Math.ceil((result.reset - Date.now()) / 1000),
      };
    } catch {
      // Redis error → fall through to in-memory
      return checkMemoryLimit(key, config);
    }
  }
  return checkMemoryLimit(key, config);
}
