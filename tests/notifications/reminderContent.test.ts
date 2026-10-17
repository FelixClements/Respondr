import { describe, expect, it } from 'vitest';
import { buildReminderPayload } from '../../src/notifications/reminderContent.js';

describe('buildReminderPayload', () => {
  it('tags each chat separately so reminders for different chats stack', () => {
    const a = buildReminderPayload({ id: 'a@c.us', name: 'Ann', lastMessageAt: 0, hoursSince: 4 });
    const b = buildReminderPayload({ id: 'b@c.us', name: 'Bob', lastMessageAt: 0, hoursSince: null });
    expect(a.tag).not.toBe(b.tag);
    expect(buildReminderPayload({ id: 'a@c.us', name: 'Ann', lastMessageAt: 0, hoursSince: 5 }).tag).toBe(
      a.tag
    );
    expect(a.body).toBe('Ann: no reply for 4.0 hours');
    expect(b.body).toBe('Bob: no reply for several hours');
  });
});
