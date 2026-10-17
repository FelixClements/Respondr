import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runOnce = vi.fn(async () => undefined);
let intervalMinutes = 45;

vi.mock('../../src/engine/runner.js', () => ({ runOnce: () => runOnce() }));
vi.mock('../../src/db/settings.js', () => ({ parseIntervalMinutes: () => intervalMinutes }));

const scheduler = await import('../../src/scheduler.js');
const MIN = 60_000;

describe('scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    runOnce.mockClear();
    intervalMinutes = 45;
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  it('runs at an even interval even when it does not divide the hour', async () => {
    scheduler.start();
    const runTimes: number[] = [];
    runOnce.mockImplementation(async () => {
      runTimes.push(Date.now());
    });
    await vi.advanceTimersByTimeAsync(3 * 45 * MIN);
    const gaps = runTimes.map((t, i) => t - (runTimes[i - 1] ?? Date.parse('2026-01-01T10:00:00Z')));
    expect(gaps).toEqual([45 * MIN, 45 * MIN, 45 * MIN]);
  });

  it('reports the next run and moves it on each run', async () => {
    scheduler.start();
    expect(scheduler.getNextRunAt()?.getTime()).toBe(Date.now() + 45 * MIN);
    await vi.advanceTimersByTimeAsync(45 * MIN);
    expect(scheduler.getNextRunAt()?.getTime()).toBe(Date.now() + 45 * MIN);
  });

  it('reschedule switches to the new interval without a leftover timer', async () => {
    scheduler.start();
    intervalMinutes = 10;
    scheduler.reschedule();
    await vi.advanceTimersByTimeAsync(45 * MIN);
    expect(runOnce).toHaveBeenCalledTimes(4);
  });

  it('stop cancels future runs', async () => {
    scheduler.start();
    scheduler.stop();
    expect(scheduler.getNextRunAt()).toBeNull();
    await vi.advanceTimersByTimeAsync(2 * 45 * MIN);
    expect(runOnce).not.toHaveBeenCalled();
  });
});
