import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  KNOWN_PLACEHOLDER_SECRETS,
  createRateLimiter,
  validateProductionConfig,
  verifySetupToken
} from '../../src/server/security.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('validateProductionConfig', () => {
  it('allows development without BETTER_AUTH_SECRET', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.BETTER_AUTH_SECRET;
    expect(() => validateProductionConfig()).not.toThrow();
  });

  it('rejects production without BETTER_AUTH_SECRET', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.BETTER_AUTH_SECRET;
    expect(() => validateProductionConfig()).toThrow(/BETTER_AUTH_SECRET is required/);
  });

  it('rejects production with short secret', () => {
    process.env.NODE_ENV = 'production';
    process.env.BETTER_AUTH_SECRET = 'short';
    process.env.BETTER_AUTH_URL = 'https://respondr.example.com';
    expect(() => validateProductionConfig()).toThrow(/at least 32 characters/);
  });

  it('rejects production with placeholder secret', () => {
    process.env.NODE_ENV = 'production';
    process.env.BETTER_AUTH_SECRET = KNOWN_PLACEHOLDER_SECRETS[0];
    process.env.BETTER_AUTH_URL = 'https://respondr.example.com';
    expect(() => validateProductionConfig()).toThrow(/placeholder/);
  });

  it('rejects production without https BETTER_AUTH_URL', () => {
    process.env.NODE_ENV = 'production';
    process.env.BETTER_AUTH_SECRET = 'a'.repeat(32);
    process.env.BETTER_AUTH_URL = 'http://respondr.example.com';
    expect(() => validateProductionConfig()).toThrow(/https:\/\//);
  });

  it('accepts valid production config', () => {
    process.env.NODE_ENV = 'production';
    process.env.BETTER_AUTH_SECRET = 'a'.repeat(32);
    process.env.BETTER_AUTH_URL = 'https://respondr.example.com';
    expect(() => validateProductionConfig()).not.toThrow();
  });
});

describe('verifySetupToken', () => {
  it('passes when SETUP_TOKEN is not configured', () => {
    delete process.env.SETUP_TOKEN;
    expect(verifySetupToken(undefined, undefined)).toBe(true);
  });

  it('requires matching token when SETUP_TOKEN is configured', () => {
    process.env.SETUP_TOKEN = 'secret-token';
    expect(verifySetupToken('secret-token', undefined)).toBe(true);
    expect(verifySetupToken('wrong', undefined)).toBe(false);
    expect(verifySetupToken(undefined, 'secret-token')).toBe(true);
  });
});

describe('createRateLimiter', () => {
  it('blocks after max requests in window', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    expect(limiter.check('1.2.3.4').allowed).toBe(true);
    expect(limiter.check('1.2.3.4').allowed).toBe(true);
    const blocked = limiter.check('1.2.3.4');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('evicts oldest entries when maxBuckets capacity is reached', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2, maxBuckets: 3 });
    limiter.check('ip-1');
    limiter.check('ip-2');
    limiter.check('ip-3');
    expect(limiter.size()).toBe(3);

    // Exceed capacity
    limiter.check('ip-4');
    expect(limiter.size()).toBe(3);
    // 'ip-1' should have been evicted and treated as a new bucket
    expect(limiter.check('ip-1').allowed).toBe(true);
  });

  it('cleans up expired entries upon check or periodically', async () => {
    const limiter = createRateLimiter({ windowMs: 10, max: 2 });
    limiter.check('ip-1');
    expect(limiter.size()).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 20));
    limiter.check('ip-2');
    // ip-1 was expired and cleaned up
    expect(limiter.size()).toBe(1);
  });
});

describe('extractClientIp', () => {
  it('ignores X-Forwarded-For and falls back to socket or loopback when TRUST_PROXY is not enabled', async () => {
    delete process.env.TRUST_PROXY;
    const { extractClientIp } = await import('../../src/server/security.js');
    const fakeContext = {
      req: {
        header: (name: string) =>
          name.toLowerCase() === 'x-forwarded-for' ? '1.2.3.4' : undefined
      },
      env: {
        incoming: {
          socket: {
            remoteAddress: '192.168.1.50'
          }
        }
      }
    } as any;
    expect(extractClientIp(fakeContext)).toBe('192.168.1.50');

    const noSocketContext = {
      req: {
        header: () => undefined
      }
    } as any;
    expect(extractClientIp(noSocketContext)).toBe('127.0.0.1');
  });

  it('uses rightmost valid X-Forwarded-For when TRUST_PROXY is true', async () => {
    process.env.TRUST_PROXY = 'true';
    const { extractClientIp } = await import('../../src/server/security.js');
    const fakeContext = {
      req: {
        header: (name: string) =>
          name.toLowerCase() === 'x-forwarded-for' ? '1.2.3.4, 5.6.7.8' : undefined
      }
    } as any;
    expect(extractClientIp(fakeContext)).toBe('5.6.7.8');
  });

  it('ignores spoofed leftmost entries and garbage, falls back to X-Real-IP only when valid', async () => {
    process.env.TRUST_PROXY = 'true';
    const { extractClientIp } = await import('../../src/server/security.js');
    const withBoth = {
      req: {
        header: (name: string) => {
          if (name.toLowerCase() === 'x-real-ip') return '9.9.9.9';
          if (name.toLowerCase() === 'x-forwarded-for') return 'spoofed, 1.2.3.4, 5.6.7.8';
          return undefined;
        }
      }
    } as any;
    expect(extractClientIp(withBoth)).toBe('5.6.7.8');

    const realIpOnly = {
      req: {
        header: (name: string) => {
          if (name.toLowerCase() === 'x-real-ip') return '9.9.9.9';
          return undefined;
        }
      }
    } as any;
    expect(extractClientIp(realIpOnly)).toBe('9.9.9.9');

    const garbageOnly = {
      req: {
        header: (name: string) => {
          if (name.toLowerCase() === 'x-real-ip') return 'not-an-ip';
          if (name.toLowerCase() === 'x-forwarded-for') return 'also-bogus';
          return undefined;
        }
      }
    } as any;
    expect(extractClientIp(garbageOnly)).toBe('127.0.0.1');
  });
});

describe('getBindHostname and HTTP setup', () => {
  it('defaults to loopback outside production', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.HOST;
    const { getBindHostname, isLoopbackBind, isHttpSetupAllowed } = await import(
      '../../src/server/security.js'
    );
    expect(getBindHostname()).toBe('127.0.0.1');
    expect(isLoopbackBind()).toBe(true);
    expect(isHttpSetupAllowed()).toBe(true);
  });

  it('blocks open HTTP setup when development binds all interfaces', async () => {
    process.env.NODE_ENV = 'development';
    process.env.HOST = '0.0.0.0';
    delete process.env.SETUP_TOKEN;
    vi.resetModules();
    const { getBindHostname, isHttpSetupAllowed } = await import('../../src/server/security.js');
    expect(getBindHostname()).toBe('0.0.0.0');
    expect(isHttpSetupAllowed()).toBe(false);
  });

  it('allows HTTP setup on a non-loopback bind when SETUP_TOKEN is set', async () => {
    process.env.NODE_ENV = 'development';
    process.env.HOST = '0.0.0.0';
    process.env.SETUP_TOKEN = 'setup-secret';
    vi.resetModules();
    const { isHttpSetupAllowed } = await import('../../src/server/security.js');
    expect(isHttpSetupAllowed()).toBe(true);
  });
});
