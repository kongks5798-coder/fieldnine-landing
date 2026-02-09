/**
 * Simple in-memory API response cache for server-side routes.
 * Entries expire after `ttlMs` milliseconds.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Get a cached value, or compute and cache it.
 * @param key - Cache key
 * @param ttlMs - Time-to-live in ms (default 30s)
 * @param compute - Async function to compute the value if not cached
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
): Promise<T> {
  const existing = cache.get(key) as CacheEntry<T> | undefined;
  if (existing && Date.now() < existing.expiresAt) {
    return existing.data;
  }

  const data = await compute();
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

/** Invalidate a specific cache key */
export function invalidateCache(key: string) {
  cache.delete(key);
}

/** Invalidate all cache keys matching a prefix */
export function invalidateCachePrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
