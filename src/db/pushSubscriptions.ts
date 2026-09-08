import type { PushSubscriptionRow } from '../types.js';
import { getDb } from './index.js';

interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const MAX_PUSH_SUBSCRIPTIONS = 25;

export function addPushSubscription(subscription: PushSubscriptionInput): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, Date.now());

  db.prepare(`
    DELETE FROM push_subscriptions
    WHERE id NOT IN (
      SELECT id FROM push_subscriptions
      ORDER BY created_at DESC
      LIMIT ?
    )
  `).run(MAX_PUSH_SUBSCRIPTIONS);
}

export function removePushSubscription(endpoint: string): void {
  const db = getDb();
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

export function getAllPushSubscriptions(): PushSubscriptionRow[] {
  const db = getDb();
  return db.prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions').all() as PushSubscriptionRow[];
}
