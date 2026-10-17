import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RECONNECT_DELAYS_MS } from '../../src/whatsapp/autoReconnect.js';

const fake = vi.hoisted(() => ({
  client: null as (import('node:events').EventEmitter & {
    initialize: ReturnType<typeof import('vitest').vi.fn>;
    destroy: ReturnType<typeof import('vitest').vi.fn>;
  }) | null
}));

vi.mock('whatsapp-web.js', async () => {
  const { EventEmitter: Emitter } = await import('node:events');
  const { vi: v } = await import('vitest');
  class Client extends Emitter {
    initialize = v.fn(async () => undefined);
    destroy = v.fn(async () => undefined);
    constructor() {
      super();
      fake.client = this as never;
    }
  }
  return { default: { Client, LocalAuth: class {} } };
});

vi.mock('qrcode', () => ({ default: { toDataURL: async () => 'data:image/png;base64,qr' } }));

const session = await import('../../src/whatsapp/session.js');
const client = () => fake.client as EventEmitter & {
  initialize: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};
const FIRST_DELAY = RECONNECT_DELAYS_MS[0];

describe('session auto-reconnect', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    // Start every test from a connected session with no retry queued.
    client().emit('ready');
    client().initialize.mockReset().mockResolvedValue(undefined);
    client().destroy.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restarts after a non-LOGOUT disconnect once the backoff delay passes', async () => {
    client().emit('disconnected', 'CONFLICT');
    const status = session.getStatus();
    expect(status.isReady).toBe(false);
    expect(status.reconnectAt).not.toBeNull();

    await vi.advanceTimersByTimeAsync(FIRST_DELAY - 1);
    expect(client().initialize).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(client().destroy).toHaveBeenCalledTimes(1);
    expect(client().initialize).toHaveBeenCalledTimes(1);

    // Page loaded but not ready yet: the next attempt stays queued until ready.
    expect(session.getStatus().reconnectAt).not.toBeNull();
    client().emit('ready');
    expect(session.getStatus()).toMatchObject({ isReady: true, reconnectAt: null });
  });

  it('never auto-restarts after LOGOUT', async () => {
    client().emit('disconnected', 'LOGOUT');
    expect(session.getStatus().reconnectAt).toBeNull();
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAYS_MS.at(-1)! * 2);
    expect(client().initialize).not.toHaveBeenCalled();
  });

  it('stops retrying once a QR code is waiting to be scanned', async () => {
    client().emit('disconnected', 'CONFLICT');
    client().emit('qr', 'qr-payload');
    expect(session.getStatus()).toMatchObject({ status: 'awaiting_qr', reconnectAt: null });
    await vi.advanceTimersByTimeAsync(FIRST_DELAY * 2);
    expect(client().initialize).not.toHaveBeenCalled();
  });

  it('shares one restart between concurrent callers', async () => {
    let finish!: () => void;
    client().initialize.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    const a = session.restartClient();
    const b = session.reconnect();
    await vi.advanceTimersByTimeAsync(0);
    finish();
    await Promise.all([a, b]);
    expect(client().destroy).toHaveBeenCalledTimes(1);
    expect(client().initialize).toHaveBeenCalledTimes(1);
  });

  it('queues a retry when a restart fails to launch the browser', async () => {
    client().initialize.mockRejectedValueOnce(new Error('chromium missing'));
    await expect(session.reconnect()).rejects.toThrow('chromium missing');
    expect(session.getStatus()).toMatchObject({ status: 'puppeteer_error' });
    expect(session.getStatus().reconnectAt).not.toBeNull();

    await vi.advanceTimersByTimeAsync(FIRST_DELAY);
    expect(client().initialize).toHaveBeenCalledTimes(2);
  });
});
