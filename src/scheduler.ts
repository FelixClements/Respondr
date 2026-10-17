import { runOnce } from './engine/runner.js';
import * as settingsDb from './db/settings.js';
import * as logger from './lib/logger.js';

// A plain timer, not cron: `*/45 * * * *` would fire at :00 and :45, giving
// gaps of 45 then 15 minutes. Overlapping runs are rejected by the scan guard.
let timer: ReturnType<typeof setTimeout> | null = null;
let nextRunAt: Date | null = null;

export function start(): void {
  stop();
  const minutes = settingsDb.parseIntervalMinutes(undefined);
  const intervalMs = minutes * 60_000;

  const scheduleNext = () => {
    nextRunAt = new Date(Date.now() + intervalMs);
    timer = setTimeout(() => {
      // Queue the next run first so a slow scan does not push the schedule back.
      scheduleNext();
      logger.debug('Scheduled scan triggered');
      void runOnce();
    }, intervalMs);
  };

  scheduleNext();
  logger.info(`Scheduler started: scanning every ${minutes} minutes`);
}

export function stop(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  nextRunAt = null;
}

export function getNextRunAt(): Date | null {
  return nextRunAt;
}

export function reschedule(): void {
  start();
}
