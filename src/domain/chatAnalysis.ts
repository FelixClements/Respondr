import type { RawChat } from '../types.js';

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

export function enrichChat(
  chat: RawChat,
  state: { state: string; until: number | null; createdAt: number } | null,
  thresholdHours: number,
  now = Date.now()
) {
  const lastTs = chat.lastMessage?.timestampMs || (chat.lastMessage?.timestamp ?? 0) * 1000 || 0;
  const elapsed = lastTs ? hoursSince(lastTs, now) : null;

  return {
    ...chat,
    hoursSince: elapsed,
    needsReply: isEligibleForReminder(chat, thresholdHours, now),
    state: state || null
  };
}

export function statsForChats(chats: RawChat[], thresholdHours: number, now = Date.now()) {
  return {
    total: chats.length,
    urgent: chats.filter((chat) => isEligibleForReminder(chat, thresholdHours, now)).length
  };
}
