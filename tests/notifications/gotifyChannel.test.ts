import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const axiosPost = vi.fn();

vi.mock('axios', () => ({
  default: {
    post: (...args: unknown[]) => axiosPost(...args)
  }
}));

vi.mock('../../src/notifications/settings.js', () => ({
  getNotificationSettings: () => ({
    gotify: {
      enabled: true,
      url: 'https://gotify.example.com',
      token: 'secret-token',
      priority: 5
    }
  })
}));

describe('gotifyChannel', () => {
  beforeEach(() => {
    axiosPost.mockReset();
    axiosPost.mockResolvedValue({});
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('sends token in X-Gotify-Key header, not query string', async () => {
    const { gotifyChannel } = await import('../../src/notifications/channels/gotifyChannel.js');

    await gotifyChannel.send({
      title: 'Test',
      body: 'Hello',
      url: '/',
      icon: '/icon.png'
    });

    expect(axiosPost).toHaveBeenCalledTimes(1);
    const [url, body, config] = axiosPost.mock.calls[0] as [
      string,
      { title: string; message: string; priority: number },
      { headers: Record<string, string> }
    ];

    expect(url).toBe('https://gotify.example.com/message');
    expect(url).not.toContain('token=');
    expect(config.headers['X-Gotify-Key']).toBe('secret-token');
    expect(body.title).toBe('Test');
    expect(body.message).toBe('Hello');
  });
});
