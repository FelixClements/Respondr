import crypto from 'node:crypto';
import type { Context } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';

export const KNOWN_PLACEHOLDER_SECRETS = [
  'dev-secret-change-me-in-production-32chars',
  'change-me-use-openssl-rand-base64-32',
  'change-me-use-openssl-rand-base64-32-for-production',
  'better-auth-secret-12345678901234567890'
];

const DEV_FALLBACK_SECRET = 'dev-secret-change-me-in-production-32chars';

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getAuthSecret(): string {
  return process.env.BETTER_AUTH_SECRET || DEV_FALLBACK_SECRET;
}

export function getSetupToken(): string | undefined {
  const token = process.env.SETUP_TOKEN?.trim();
  return token || undefined;
}

export function getBindHostname(): string {
  const host = process.env.HOST?.trim();
  if (host) return host;
  return isProduction() ? '0.0.0.0' : '127.0.0.1';
}

export function isLoopbackBind(hostname = getBindHostname()): boolean {
  return hostname === '127.0.0.1' || hostname === '::1' || hostname === 'localhost';
}

export function requiresSetupToken(): boolean {
  return isProduction() && Boolean(getSetupToken());
}

export function isHttpSetupAllowed(): boolean {
  if (getSetupToken()) return true;
  if (isProduction()) return false;
  return isLoopbackBind();
}

export function validateProductionConfig(): void {
  if (!isProduction()) return;

  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'BETTER_AUTH_SECRET is required in production. Generate one with: openssl rand -base64 32'
    );
  }
  if (secret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be at least 32 characters in production.');
  }
  if (KNOWN_PLACEHOLDER_SECRETS.includes(secret)) {
    throw new Error(
      'BETTER_AUTH_SECRET must not be a placeholder value in production. Generate one with: openssl rand -base64 32'
    );
  }

  const baseUrl = process.env.BETTER_AUTH_URL?.trim();
  if (!baseUrl?.startsWith('https://')) {
    throw new Error(
      'BETTER_AUTH_URL must start with https:// in production. Terminate TLS at a reverse proxy and set BETTER_AUTH_URL to your public HTTPS origin.'
    );
  }
}

export function isTrustProxyEnabled(): boolean {
  const val = process.env.TRUST_PROXY?.trim().toLowerCase();
  return val === 'true' || val === '1';
}

export function extractClientIp(c: Context): string {
  if (isTrustProxyEnabled()) {
    const realIp = c.req.header('x-real-ip')?.trim();
    if (realIp) return realIp;

    const forwarded = c.req.header('x-forwarded-for');
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim();
      if (first) return first;
    }
  }

  try {
    const conn = getConnInfo(c);
    const remoteAddress = conn?.remote?.address?.trim();
    if (remoteAddress) return remoteAddress;
  } catch {
    // When invoked without an underlying Node HTTP server (e.g. test environments)
  }

  return '127.0.0.1';
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

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

export const setupRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5
});

export const authStatusRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30
});

export const signInRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10
});

export function verifySetupToken(
  headerToken: string | undefined,
  bodyToken: string | undefined
): boolean {
  const expected = getSetupToken();
  if (!expected) return true;
  const provided = (headerToken || bodyToken || '').trim();
  if (!provided) return false;

  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}
