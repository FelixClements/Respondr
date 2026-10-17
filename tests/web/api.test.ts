import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../web/src/lib/api';

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends JSON with credentials and the method and body it was given', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await api.put('/settings', { a: 1 })).toEqual({ ok: true });
    const [path, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/api/settings');
    expect(init).toMatchObject({ method: 'PUT', body: '{"a":1}', credentials: 'include' });
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('surfaces the server error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'Please wait' }), { status: 429 }))
    );
    await expect(api.post('/run')).rejects.toThrow('Please wait');
  });
});
