import type { Context } from 'hono';

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

export function requiresSetupToken(): boolean {
  return isProduction() && Boolean(getSetupToken());
}

export function isHttpSetupAllowed(): boolean {
  if (!isProduction()) return true;
  return Boolean(getSetupToken());
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

export function extractClientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = c.req.header('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: { windowMs: number; max: number }) {
  const buckets = new Map<string, RateLimitBucket>();

  return {
    check(key: string): { allowed: boolean; retryAfterSeconds: number } {
      const now = Date.now();
      const bucket = buckets.get(key);

      if (!bucket || now >= bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + options.windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (bucket.count >= options.max) {
        const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
        return { allowed: false, retryAfterSeconds };
      }

      bucket.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
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

export function verifySetupToken(
  headerToken: string | undefined,
  bodyToken: string | undefined
): boolean {
  const expected = getSetupToken();
  if (!expected) return true;
  const provided = (headerToken || bodyToken || '').trim();
  return provided.length > 0 && provided === expected;
}
