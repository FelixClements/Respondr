import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authHandler = vi.fn(async () => new Response('ok', { status: 200 }));

vi.mock('../../src/server/auth.js', () => ({
  auth: { handler: (...args: unknown[]) => authHandler(...args) },
  ensureBootstrapUser: vi.fn(),
  createInitialUser: vi.fn(),
  hasUsers: vi.fn()
}));

describe('sign-in rate limit', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    authHandler.mockClear();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'development';
    delete process.env.SETUP_TOKEN;
    delete process.env.HOST;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function loadApp() {
    const { createApp } = await import('../../src/server/index.js');
    return createApp();
  }

  it('blocks the 11th sign-in POST from the same IP and leaves get-session alone', async () => {
    const app = await loadApp();
    const headers = { 'Content-Type': 'application/json', 'x-forwarded-for': '7.7.7.7' };
    const body = JSON.stringify({ username: 'admin', password: 'wrong-password' });

    for (let i = 0; i < 10; i++) {
      const res = await app.request('/api/auth/sign-in/username', {
        method: 'POST',
        headers,
        body
      });
      expect(res.status).not.toBe(429);
    }

    const blocked = await app.request('/api/auth/sign-in/username', {
      method: 'POST',
      headers,
      body
    });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();

    const session = await app.request('/api/auth/get-session', { headers });
    expect(session.status).not.toBe(429);
  });
});
