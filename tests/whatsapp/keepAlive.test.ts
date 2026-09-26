import { describe, it, expect } from 'vitest';
import {
  decideKeepAlive,
  performKeepAlive,
  KEEPALIVE_LOGOUT_ERROR,
  KEEPALIVE_STALE_ERROR
} from '../../src/whatsapp/keepAlive.js';

describe('decideKeepAlive', () => {
  it('continues when the socket is connected and presence succeeded', () => {
    expect(
      decideKeepAlive({ disconnectReason: null, state: 'CONNECTED' })
    ).toBe('continue');
  });

  it('restarts when the socket is not connected', () => {
    expect(
      decideKeepAlive({ disconnectReason: null, state: 'OPENING' })
    ).toBe('restart');
  });

  it('restarts when presence or state check failed', () => {
    expect(
      decideKeepAlive({ disconnectReason: null, pingError: 'Evaluation failed' })
    ).toBe('restart');
  });

  it('waits for QR instead of restarting after a LOGOUT', () => {
    expect(
      decideKeepAlive({
        disconnectReason: 'LOGOUT',
        state: 'UNPAIRED',
        pingError: 'logged out'
      })
    ).toBe('wait_for_qr');
  });
});

describe('performKeepAlive', () => {
  it('sends presence then checks state when the session is healthy', async () => {
    const calls: string[] = [];
    await performKeepAlive({
      disconnectReason: null,
      sendPresenceAvailable: async () => {
        calls.push('presence');
      },
      getState: async () => {
        calls.push('state');
        return 'CONNECTED';
      },
      restartClient: async () => {
        calls.push('restart');
      }
    });
    expect(calls).toEqual(['presence', 'state']);
  });

  it('restarts and throws when the socket is not connected', async () => {
    const calls: string[] = [];
    await expect(
      performKeepAlive({
        disconnectReason: null,
        sendPresenceAvailable: async () => {
          calls.push('presence');
        },
        getState: async () => {
          calls.push('state');
          return 'OPENING';
        },
        restartClient: async () => {
          calls.push('restart');
        }
      })
    ).rejects.toThrow(KEEPALIVE_STALE_ERROR);
    expect(calls).toEqual(['presence', 'state', 'restart']);
  });

  it('restarts and throws when the presence ping fails', async () => {
    const calls: string[] = [];
    await expect(
      performKeepAlive({
        disconnectReason: null,
        sendPresenceAvailable: async () => {
          calls.push('presence');
          throw new Error('Evaluation failed');
        },
        getState: async () => {
          calls.push('state');
          return 'CONNECTED';
        },
        restartClient: async () => {
          calls.push('restart');
        }
      })
    ).rejects.toThrow(KEEPALIVE_STALE_ERROR);
    expect(calls).toEqual(['presence', 'restart']);
  });

  it('does not ping or restart after a LOGOUT', async () => {
    const calls: string[] = [];
    await expect(
      performKeepAlive({
        disconnectReason: 'LOGOUT',
        sendPresenceAvailable: async () => {
          calls.push('presence');
        },
        getState: async () => {
          calls.push('state');
          return 'CONNECTED';
        },
        restartClient: async () => {
          calls.push('restart');
        }
      })
    ).rejects.toThrow(KEEPALIVE_LOGOUT_ERROR);
    expect(calls).toEqual([]);
  });
});
