/**
 * Simple in-memory rate limiter (token bucket).
 * No external dependencies. Resets on server restart.
 */

interface BucketEntry {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, BucketEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now - entry.lastRefill > 10 * 60 * 1000) buckets.delete(key);
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  /** Max requests in the window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
}

/**
 * Returns { allowed, remaining, retryAfterSec }.
 * `key` is typically the client IP.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { limit: 15, windowSec: 60 },
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry) {
    buckets.set(key, { tokens: config.limit - 1, lastRefill: now });
    return { allowed: true, remaining: config.limit - 1, retryAfterSec: 0 };
  }

  // Refill tokens based on elapsed time
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
