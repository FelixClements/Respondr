import { describe, it, expect } from 'vitest';
import { createGuard } from '../../src/lib/guard.js';

describe('guard', () => {
  it('acquires once and denies while held', () => {
    const guard = createGuard();
    expect(guard.tryAcquire()).toBe(true);
    expect(guard.tryAcquire()).toBe(false);
    guard.release();
    expect(guard.tryAcquire()).toBe(true);
  });

  it('resets for tests', () => {
    const guard = createGuard();
    expect(guard.tryAcquire()).toBe(true);
    guard.resetForTests();
    expect(guard.tryAcquire()).toBe(true);
  });

  it('expires stuck locks after timeout', () => {
    const guard = createGuard(10);
    expect(guard.tryAcquire()).toBe(true);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(guard.tryAcquire()).toBe(true);
        resolve();
      }, 25);
    });
  });
});
