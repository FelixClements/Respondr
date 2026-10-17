/**
 * Single-flight in-process guard for the scan path, with a timeout so a stuck
 * holder cannot block forever.
 */
export interface Guard {
  tryAcquire(): boolean;
  release(): void;
  resetForTests(): void;
}

export function createGuard(timeoutMs = 10 * 60 * 1000): Guard {
  let heldAt: number | null = null;

  function isStale(now: number): boolean {
    return heldAt !== null && now - heldAt > timeoutMs;
  }

  return {
    tryAcquire(): boolean {
      const now = Date.now();
      if (heldAt === null || isStale(now)) {
        heldAt = now;
        return true;
      }
      return false;
    },
    release(): void {
      heldAt = null;
    },
    resetForTests(): void {
      heldAt = null;
    }
  };
}
