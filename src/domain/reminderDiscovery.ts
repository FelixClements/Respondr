import type { RawChat, ForgottenChat } from '../types.js';

export function hoursSince(timestampMs: number | null | undefined, now = Date.now()): number | null {
  if (!timestampMs || !now) return null;
  return Number(((now - timestampMs) / (1000 * 60 * 60)).toFixed(1));
}

export function isEligibleForReminder(
  chat: RawChat | null | undefined,
  thresholdHours: number,
  now = Date.now()
): boolean {
  if (!chat || chat.isGroup || chat.isArchived || chat.isMuted) return false;
  if (!chat.lastMessage) return false;
  if (chat.lastMessage.fromMe || chat.lastMessage.hasReactionFromMe) return false;

  const lastTs = chat.lastMessage.timestampMs || chat.lastMessage.timestamp * 1000;
  if (!lastTs || !Number.isFinite(lastTs)) return false;

  return (now - lastTs) / (1000 * 60 * 60) > thresholdHours;
}

export interface ChatWorkflowState {
  state: string;
  until: number | null;
  createdAt: number;
}

export interface DiscoveryContext {
  ignoredIds: Set<string>;
  doneById: Map<string, ChatWorkflowState>;
}

export function buildDiscoveryContext(
  stateRows: Array<{ id: string; state: string; until: number | null; created_at: number }>
): DiscoveryContext {
  const ignoredIds = new Set<string>();
  const doneById = new Map<string, ChatWorkflowState>();

  for (const row of stateRows) {
    if (row.state === 'ignored') {
      ignoredIds.add(row.id);
    } else if (row.state === 'done') {
      doneById.set(row.id, {
        state: row.state,
        until: row.until,
        createdAt: row.created_at
      });
    }
  }

  return { ignoredIds, doneById };
}

/**
 * Pure stale-done check. Returns true when the done row should be cleared
 * (expired `until` or a newer message arrived). Callers persist the reset;
 * this module never touches the DB so reads stay side-effect free.
 */
export function shouldResetDoneState(
  doneState: ChatWorkflowState | undefined,
  lastMessageAt: number,
  now = Date.now()
): boolean {
  if (!doneState) return false;
  if (doneState.until && now > doneState.until) return true;
  if (lastMessageAt && lastMessageAt > doneState.createdAt) return true;
  return false;
}

/**
 * Pure scan decision for a done chat: true = eligible to scan (no done state
 * or stale done that the caller should reset first).
 */
export function shouldScanDoneChat(
  doneState: ChatWorkflowState | undefined,
  lastMessageAt: number,
  now = Date.now()
): boolean {
  if (!doneState) return true;
  return shouldResetDoneState(doneState, lastMessageAt, now);
}

/** @deprecated use shouldScanDoneChat + shouldResetDoneState (pure, no DB). */
export function reconcileStaleDone(
  _chatId: string,
  lastMessageAt: number,
  doneState: ChatWorkflowState | undefined,
  now = Date.now()
): boolean {
  return shouldScanDoneChat(doneState, lastMessageAt, now);
}

export function discoverReminders(
  chats: RawChat[],
  thresholdHours: number,
  context: DiscoveryContext,
  now = Date.now()
): { totalChecked: number; forgotten: ForgottenChat[]; resetDoneIds: string[] } {
  const forgotten: ForgottenChat[] = [];
  const resetDoneIds: string[] = [];

  for (const chat of chats) {
    if (context.ignoredIds.has(chat.id)) continue;

    const doneState = context.doneById.get(chat.id);
    if (doneState) {
      const lastMessageAt = chat.lastMessage?.timestampMs || 0;
      if (shouldResetDoneState(doneState, lastMessageAt, now)) {
        resetDoneIds.push(chat.id);
      } else {
        continue;
      }
    }

    if (!isEligibleForReminder(chat, thresholdHours, now)) continue;

    const lastMessageAt =
      chat.lastMessage!.timestampMs || chat.lastMessage!.timestamp * 1000;
    forgotten.push({
      id: chat.id,
      name: chat.name,
      lastMessageAt,
      hoursSince: hoursSince(lastMessageAt, now)
    });
  }

  return { totalChecked: chats.length, forgotten, resetDoneIds };
}

export function enrichChat(
  chat: RawChat,
  state: ChatWorkflowState | null,
  thresholdHours: number,
  now = Date.now()
) {
  const lastTs = chat.lastMessage?.timestampMs || (chat.lastMessage?.timestamp ?? 0) * 1000 || 0;
  const elapsed = lastTs ? hoursSince(lastTs, now) : null;
  const eligible = isEligibleForReminder(chat, thresholdHours, now);
  let suppressed = false;
  if (state?.state === 'ignored') {
    suppressed = true;
  } else if (state?.state === 'done') {
    suppressed = !shouldScanDoneChat(state, lastTs, now);
  }

  return {
    ...chat,
    hoursSince: elapsed,
    needsReply: eligible && !suppressed,
    state: state || null
  };
}

export function statsForChats(
  chats: RawChat[],
  stateById: Record<string, ChatWorkflowState | undefined>,
  thresholdHours: number,
  now = Date.now()
) {
  let urgent = 0;
  for (const chat of chats) {
    if (enrichChat(chat, stateById[chat.id] || null, thresholdHours, now).needsReply) {
      urgent += 1;
    }
  }
  return { total: chats.length, urgent };
}
