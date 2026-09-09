import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hasUsersMock = vi.fn();
const createInitialUserMock = vi.fn();

vi.mock('../../src/server/auth.js', () => ({
  auth: { handler: vi.fn() },
  ensureBootstrapUser: vi.fn(),
  runAuthMigrations: vi.fn(),
  createInitialUser: (...args: unknown[]) => createInitialUserMock(...args),
  hasUsers: () => hasUsersMock()
}));

describe('setup routes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    hasUsersMock.mockReset();
    createInitialUserMock.mockReset();
    process.env = { ...originalEnv };
    process.env.TRUST_PROXY = 'true';
    delete process.env.SETUP_TOKEN;
    delete process.env.HOST;
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function loadApp() {
    const { createApp } = await import('../../src/server/index.js');
    return createApp();
  }

  it('returns requiresSetupToken when production and SETUP_TOKEN is set', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SETUP_TOKEN = 'setup-secret';
    hasUsersMock.mockResolvedValue(false);

    const app = await loadApp();
    const res = await app.request('/api/auth-status');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      hasUsers: false,
      requiresSetupToken: true
    });
  });

  it('blocks HTTP setup in production without SETUP_TOKEN', async () => {
    process.env.NODE_ENV = 'production';
    hasUsersMock.mockResolvedValue(false);

    const app = await loadApp();
    const res = await app.request('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });

    expect(res.status).toBe(503);
  });

  it('requires setup token in production when SETUP_TOKEN is configured', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SETUP_TOKEN = 'setup-secret';
    hasUsersMock.mockResolvedValue(false);

    const app = await loadApp();
    const res = await app.request('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });

    expect(res.status).toBe(401);
  });

  it('creates account when setup token matches', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SETUP_TOKEN = 'setup-secret';
    hasUsersMock.mockResolvedValue(false);
    createInitialUserMock.mockResolvedValue(undefined);

    const app = await loadApp();
    const res = await app.request('/api/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Setup-Token': 'setup-secret'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'password12345'
      })
    });

    expect(res.status).toBe(200);
    expect(createInitialUserMock).toHaveBeenCalledWith('admin', 'password12345');
  });

  it('returns 429 when setup rate limit is exceeded', async () => {
    hasUsersMock.mockResolvedValue(false);

    const app = await loadApp();
    const body = JSON.stringify({ username: 'admin', password: 'password12345' });
    const headers = { 'Content-Type': 'application/json', 'x-forwarded-for': '9.9.9.9' };

    for (let i = 0; i < 5; i++) {
      const res = await app.request('/api/setup', { method: 'POST', headers, body });
      expect(res.status).not.toBe(429);
    }

    const blocked = await app.request('/api/setup', { method: 'POST', headers, body });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
  });

  it('blocks HTTP setup in development when HOST is 0.0.0.0 and no SETUP_TOKEN', async () => {
    process.env.HOST = '0.0.0.0';
    hasUsersMock.mockResolvedValue(false);

    const app = await loadApp();
    const res = await app.request('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password12345' })
    });

    expect(res.status).toBe(503);
    expect(createInitialUserMock).not.toHaveBeenCalled();
  });

  it('creates account in development on the default loopback bind', async () => {
    hasUsersMock.mockResolvedValue(false);
    createInitialUserMock.mockResolvedValue(undefined);

    const app = await loadApp();
    const res = await app.request('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password12345' })
    });

    expect(res.status).toBe(200);
    expect(createInitialUserMock).toHaveBeenCalledWith('admin', 'password12345');
  });

  it('blocks username enumeration and direct sign-up routes with 404', async () => {
    const app = await loadApp();
    const resAvailable = await app.request('/api/auth/is-username-available', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin' })
    });
    expect(resAvailable.status).toBe(404);

    const resSignUp = await app.request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'password123' })
    });
    expect(resSignUp.status).toBe(404);
  });

  it('includes Content-Security-Policy and Permissions-Policy headers', async () => {
    const app = await loadApp();
    const res = await app.request('/api/auth-status');
    const csp = res.headers.get('content-security-policy');
    const permissions = res.headers.get('permissions-policy');

    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain('script-src');
    expect(csp).toContain("'self'");
    expect(csp).toContain('style-src');
    expect(csp).toContain('https://fonts.googleapis.com');
    expect(csp).toContain('font-src');
    expect(csp).toContain('https://fonts.gstatic.com');
    expect(csp).toContain('object-src');
    expect(permissions).toBeDefined();
    expect(permissions).toContain('camera=()');
  });
});
