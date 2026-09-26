export type KeepAliveDecision = 'continue' | 'restart' | 'wait_for_qr';

export const KEEPALIVE_LOGOUT_ERROR = 'WhatsApp session logged out; scan QR to relink';
export const KEEPALIVE_STALE_ERROR = 'WhatsApp connection was stale; restarted session';

export function decideKeepAlive(input: {
  disconnectReason?: string | null;
  state?: string | null;
  pingError?: string | null;
}): KeepAliveDecision {
  if (input.disconnectReason === 'LOGOUT') return 'wait_for_qr';
  if (input.pingError) return 'restart';
  if ('state' in input && input.state !== 'CONNECTED') return 'restart';
  return 'continue';
}

export async function performKeepAlive(ops: {
  disconnectReason: string | null;
  sendPresenceAvailable: () => Promise<void>;
  getState: () => Promise<string | null | undefined>;
  restartClient: () => Promise<void>;
}): Promise<void> {
  if (decideKeepAlive({ disconnectReason: ops.disconnectReason }) === 'wait_for_qr') {
    throw new Error(KEEPALIVE_LOGOUT_ERROR);
  }

  let state: string | null | undefined;
  try {
    await ops.sendPresenceAvailable();
    state = await ops.getState();
  } catch (err) {
    const pingError = err instanceof Error ? err.message : String(err);
    await applyKeepAliveDecision(
      decideKeepAlive({ disconnectReason: ops.disconnectReason, pingError }),
      ops.restartClient
    );
    return;
  }

  await applyKeepAliveDecision(
    decideKeepAlive({ disconnectReason: ops.disconnectReason, state: state ?? null }),
    ops.restartClient
  );
}

async function applyKeepAliveDecision(
  decision: KeepAliveDecision,
  restartClient: () => Promise<void>
): Promise<void> {
  if (decision === 'continue') return;
  if (decision === 'wait_for_qr') {
    throw new Error(KEEPALIVE_LOGOUT_ERROR);
  }
  await restartClient();
  throw new Error(KEEPALIVE_STALE_ERROR);
}
