import { describe, it, expect, vi } from 'vitest';
import { createDispatcher } from '../../src/notifications/dispatcher.js';
import type { NotificationChannel, NotificationPayload } from '../../src/notifications/types.js';

const payload: NotificationPayload = {
  title: 'Test',
  body: 'Hello',
  url: '/',
  icon: '/icon.png'
};

function fakeChannel(
  id: 'ntfy' | 'gotify' | 'web-push',
  available: boolean,
  sendResult: () => Promise<{ channel: typeof id; status: 'sent' | 'failed'; error?: string }>
): NotificationChannel {
  return {
    id,
    isAvailable: () => available,
    send: sendResult
  };
}

describe('createDispatcher', () => {
  it('skips unavailable channels', async () => {
    const send = vi.fn();
    const dispatcher = createDispatcher([
      fakeChannel('ntfy', false, send),
      fakeChannel('gotify', true, async () => ({ channel: 'gotify', status: 'sent' }))
    ]);

    const report = await dispatcher.dispatch(payload);

    expect(send).not.toHaveBeenCalled();
    expect(report.outcomes).toEqual([
      { channel: 'ntfy', status: 'skipped' },
      { channel: 'gotify', status: 'sent' }
    ]);
    expect(report.anySent).toBe(true);
  });

  it('reports failure without throwing', async () => {
    const dispatcher = createDispatcher([
      fakeChannel('ntfy', true, async () => ({
        channel: 'ntfy',
        status: 'failed',
        error: 'network'
      }))
    ]);

    const report = await dispatcher.dispatch(payload);

    expect(report.anySent).toBe(false);
    expect(report.outcomes[0]).toMatchObject({ status: 'failed', error: 'network' });
  });

  it('marks anySent when at least one channel succeeds', async () => {
    const dispatcher = createDispatcher([
      fakeChannel('ntfy', true, async () => ({ channel: 'ntfy', status: 'failed', error: 'x' })),
      fakeChannel('web-push', true, async () => ({ channel: 'web-push', status: 'sent', sent: 1 }))
    ]);

    const report = await dispatcher.dispatch(payload);
    expect(report.anySent).toBe(true);
  });

  it('returns none skipped when no channels registered', async () => {
    const dispatcher = createDispatcher([]);
    const report = await dispatcher.dispatch(payload);
    expect(report.outcomes).toEqual([
      { channel: 'none', status: 'skipped', error: 'No channels configured' }
    ]);
    expect(report.anySent).toBe(false);
  });
});
