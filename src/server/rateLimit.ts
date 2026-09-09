interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export const RATE_LIMIT_POLICY = {
  setup: { windowMs: 15 * 60 * 1000, max: 5 },
  authStatus: { windowMs: 60 * 1000, max: 30 },
  signIn: { windowMs: 15 * 60 * 1000, max: 10 }
} as const;

export function createRateLimiter(options: { windowMs: number; max: number; maxBuckets?: number }) {
  const buckets = new Map<string, RateLimitBucket>();
  const maxBuckets = options.maxBuckets ?? 5000;

  function pruneExpired(now: number) {
    for (const [k, bucket] of buckets.entries()) {
      if (now >= bucket.resetAt) {
        buckets.delete(k);
      }
    }
  }

  return {
    check(key: string): { allowed: boolean; retryAfterSeconds: number } {
      const now = Date.now();
      pruneExpired(now);
      const bucket = buckets.get(key);

      if (!bucket || now >= bucket.resetAt) {
        // Refresh entry
        if (bucket) {
          buckets.delete(key);
        } else if (buckets.size >= maxBuckets) {
          pruneExpired(now);
          while (buckets.size >= maxBuckets) {
            const oldestKey = buckets.keys().next().value;
            if (oldestKey === undefined) break;
            buckets.delete(oldestKey);
          }
        }
        buckets.set(key, { count: 1, resetAt: now + options.windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (bucket.count >= options.max) {
        const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
        return { allowed: false, retryAfterSeconds };
      }

      bucket.count += 1;
      // Refresh LRU order on update
      buckets.delete(key);
      buckets.set(key, bucket);
      return { allowed: true, retryAfterSeconds: 0 };
    },
    size(): number {
      return buckets.size;
    },
    reset(): void {
      buckets.clear();
    }
  };
}

export const setupRateLimiter = createRateLimiter(RATE_LIMIT_POLICY.setup);

export const authStatusRateLimiter = createRateLimiter(RATE_LIMIT_POLICY.authStatus);

export const signInRateLimiter = createRateLimiter(RATE_LIMIT_POLICY.signIn);
