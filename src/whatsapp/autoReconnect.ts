import * as logger from '../lib/logger.js';

/**
 * Waits between automatic restart attempts. The last value repeats. Long on
 * purpose: rapid restarts look like bot traffic, and a fresh session can take
 * a minute or more to load before it reports ready.
 */
export const RECONNECT_DELAYS_MS = [2, 5, 15, 30, 60].map((minutes) => minutes * 60_000);

export interface AutoReconnect {
  /** Queue the next attempt with the next backoff delay. No-op if one is already queued. */
  schedule(): void;
  /** Cancel any queued attempt and start the backoff over. */
  reset(): void;
  /** When the queued attempt will run (epoch ms), or null. */
  nextAttemptAt(): number | null;
}

/**
 * Restarts a dropped WhatsApp session with growing delays. The session calls
 * `schedule` after a disconnect or a restart that did not reach `ready`, and
 * `reset` on `ready`, on QR, and on LOGOUT (which needs a human to rescan).
 * An attempt is skipped if `needsRestart` has turned false in the meantime.
 */
export function createAutoReconnect(opts: {
  restart: () => Promise<void>;
  needsRestart: () => boolean;
  delaysMs?: number[];
}): AutoReconnect {
  const delays = opts.delaysMs ?? RECONNECT_DELAYS_MS;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dueAt: number | null = null;

  function schedule(): void {
    if (timer) return;
    const delay = delays[Math.min(attempt, delays.length - 1)];
    attempt += 1;
    dueAt = Date.now() + delay;
    logger.info(`WhatsApp auto-reconnect attempt ${attempt} in ${Math.round(delay / 60_000)} min`);
    timer = setTimeout(() => void run(), delay);
    timer.unref?.();
  }

  function reset(): void {
    if (timer) clearTimeout(timer);
    timer = null;
    dueAt = null;
    attempt = 0;
  }

  async function run(): Promise<void> {
    timer = null;
    dueAt = null;
    if (!opts.needsRestart()) {
      reset();
      return;
    }
    try {
      // The restart queues the next attempt itself (on failure, or while the
      // session is still not ready), so the backoff keeps growing.
      await opts.restart();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`WhatsApp auto-reconnect failed: ${message}`);
    }
  }

  return { schedule, reset, nextAttemptAt: () => dueAt };
}
