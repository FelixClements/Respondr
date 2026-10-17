import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutoReconnect } from '../../src/whatsapp/autoReconnect.js';

const delaysMs = [1000, 5000, 20_000];

describe('createAutoReconnect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits the backoff delay before restarting, growing with each attempt and capping at the last', async () => {
    const restart = vi.fn(async () => undefined);
    const reconnect = createAutoReconnect({ restart, needsRestart: () => true, delaysMs });

    const expected = [1000, 5000, 20_000, 20_000];
    for (const [i, delay] of expected.entries()) {
      reconnect.schedule();
      expect(reconnect.nextAttemptAt()).toBe(Date.now() + delay);
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(restart).toHaveBeenCalledTimes(i);
      await vi.advanceTimersByTimeAsync(1);
      expect(restart).toHaveBeenCalledTimes(i + 1);
      expect(reconnect.nextAttemptAt()).toBeNull();
    }
  });

  it('keeps a single queued attempt when scheduled repeatedly', async () => {
    const restart = vi.fn(async () => undefined);
    const reconnect = createAutoReconnect({ restart, needsRestart: () => true, delaysMs });
    reconnect.schedule();
    reconnect.schedule();
    reconnect.schedule();
    expect(reconnect.nextAttemptAt()).toBe(1000);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(restart).toHaveBeenCalledTimes(1);
  });

  it('reset cancels the queued attempt and starts the backoff over', async () => {
    const restart = vi.fn(async () => undefined);
    const reconnect = createAutoReconnect({ restart, needsRestart: () => true, delaysMs });
    reconnect.schedule();
    await vi.advanceTimersByTimeAsync(1000);
    reconnect.schedule();
    expect(reconnect.nextAttemptAt()).toBe(Date.now() + 5000);

    reconnect.reset();
    expect(reconnect.nextAttemptAt()).toBeNull();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(restart).toHaveBeenCalledTimes(1);

    reconnect.schedule();
    expect(reconnect.nextAttemptAt()).toBe(Date.now() + 1000);
  });

  it('skips the restart and resets when the session recovered meanwhile', async () => {
    const restart = vi.fn(async () => undefined);
    let needed = true;
    const reconnect = createAutoReconnect({ restart, needsRestart: () => needed, delaysMs });
    reconnect.schedule();
    needed = false;
    await vi.advanceTimersByTimeAsync(1000);
    expect(restart).not.toHaveBeenCalled();

    needed = true;
    reconnect.schedule();
    expect(reconnect.nextAttemptAt()).toBe(Date.now() + 1000);
  });

  it('survives a failing restart', async () => {
    const restart = vi.fn(async () => {
      throw new Error('chromium crashed');
    });
    const reconnect = createAutoReconnect({ restart, needsRestart: () => true, delaysMs });
    reconnect.schedule();
    await vi.advanceTimersByTimeAsync(1000);
    expect(restart).toHaveBeenCalledTimes(1);
    reconnect.schedule();
    expect(reconnect.nextAttemptAt()).toBe(Date.now() + 5000);
  });
});
