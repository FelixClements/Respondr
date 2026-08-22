import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb, initDb } from '../src/db/index.js';
import * as chatStateDb from '../src/db/chatState.js';
import {
  hoursSince,
  isEligibleForReminder,
  enrichChat,
  statsForChats,
  discoverReminders,
  buildDiscoveryContext
} from '../src/domain/reminderDiscovery.js';
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

describe('reminderDiscovery', () => {
  let dbPath = '';

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `respondr-discovery-${Date.now()}.db`);
    process.env.DB_PATH = dbPath;
    initDb();
  });

  afterEach(() => {
    closeDb();
    if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    delete process.env.DB_PATH;
  });

  const now = 1000 * 1000 + 4 * 60 * 60 * 1000;

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

  it('suppresses needsReply for done chats', () => {
    chatStateDb.add('1', 'Alice', 'done');
    const enriched = enrichChat(baseChat, { state: 'done', until: null, createdAt: now }, 3, now);
    expect(enriched.needsReply).toBe(false);
  });

  it('aggregates stats using workflow state', () => {
    const stats = statsForChats([baseChat], {}, 3, now);
    expect(stats.total).toBe(1);
    expect(stats.urgent).toBe(1);
  });

  it('discovers reminders while skipping ignored chats', () => {
    const context = buildDiscoveryContext([
      { id: '2', state: 'ignored', until: null, created_at: now }
    ]);
    const ignoredChat = { ...baseChat, id: '2', name: 'Bob' };
    const result = discoverReminders([baseChat, ignoredChat], 3, context, now);
    expect(result.forgotten).toHaveLength(1);
    expect(result.forgotten[0].id).toBe('1');
  });
});
