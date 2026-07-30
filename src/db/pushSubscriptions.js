const { getDb } = require('./index');

function addPushSubscription(subscription) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    Date.now()
  );
}

function removePushSubscription(endpoint) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?');
  stmt.run(endpoint);
}

function getAllPushSubscriptions() {
  const db = getDb();
  return db.prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions').all();
}

module.exports = {
  addPushSubscription,
  removePushSubscription,
  getAllPushSubscriptions
};
