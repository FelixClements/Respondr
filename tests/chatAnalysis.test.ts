import { describe, it, expect } from 'vitest';
import {
  hoursSince,
  isEligibleForReminder,
  enrichChat,
  statsForChats
} from '../src/domain/chatAnalysis.js';
import type { RawChat } from '../src/types.js';

const baseChat: RawChat = {
  id: '1',
  name: 'Alice',
  isGroup: false,
  isArchived: false,
  isMuted: false,
  lastMessage: {
    fromMe: false,
    timestamp: 1000,
    timestampMs: 1000 * 1000,
    hasReactionFromMe: false
  }
};

describe('chatAnalysis', () => {
  const now = 1000 * 1000 + 4 * 60 * 60 * 1000; // 4 hours after last message

  it('calculates hours since timestamp', () => {
    expect(hoursSince(1000 * 1000, now)).toBe(4);
  });

  it('flags chat as needing reply after threshold', () => {
    expect(isEligibleForReminder(baseChat, 3, now)).toBe(true);
    expect(isEligibleForReminder(baseChat, 5, now)).toBe(false);
  });

  it('skips groups and archived chats', () => {
    expect(isEligibleForReminder({ ...baseChat, isGroup: true }, 3, now)).toBe(false);
    expect(isEligibleForReminder({ ...baseChat, isArchived: true }, 3, now)).toBe(false);
  });

  it('enriches chat with needsReply flag', () => {
    const enriched = enrichChat(baseChat, null, 3, now);
    expect(enriched.needsReply).toBe(true);
    expect(enriched.hoursSince).toBe(4);
  });

  it('aggregates stats for chat list', () => {
    const stats = statsForChats([baseChat], 3, now);
    expect(stats.total).toBe(1);
    expect(stats.urgent).toBe(1);
  });
});
