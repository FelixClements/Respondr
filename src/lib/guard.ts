/**
 * Single-flight in-process guard shared by scan/reconnect/manual-run paths.
 * Collapses the three bespoke booleans into one tested abstraction with
 * timeout (stuck-lock safety) and a test reset hook.
 */
export interface Guard {
  tryAcquire(): boolean;
  release(): void;
  isHeld(): boolean;
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
    isHeld(): boolean {
      if (heldAt === null) return false;
      if (isStale(Date.now())) {
        heldAt = null;
        return false;
      }
      return true;
    },
    resetForTests(): void {
      heldAt = null;
    }
  };
}
