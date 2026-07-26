const ntfy = require('./ntfy');
const gotify = require('./gotify');
const { getNotificationConfig } = require('./config');

function formatMessage(chat) {
  const hours = typeof chat.hoursSince === 'number' ? chat.hoursSince.toFixed(1) : 'several';
  return `${chat.name}: no reply for ${hours} hours`;
}

async function send(chat) {
  const config = getNotificationConfig();
  const title = 'Respondr reminder';
  const message = formatMessage(chat);

  await Promise.all([
    config.ntfy.enabled ? ntfy.send({ title, message, priority: config.ntfy.priority }) : Promise.resolve(),
    config.gotify.enabled ? gotify.send({ title, message, priority: config.gotify.priority }) : Promise.resolve()
  ]);
}

async function sendTest(title, message) {
  const config = getNotificationConfig();
  const results = [];

  if (config.ntfy.enabled) {
    try {
      await ntfy.send({ title, message, priority: config.ntfy.priority });
      results.push({ provider: 'ntfy', ok: true });
    } catch (err) {
      results.push({ provider: 'ntfy', ok: false, error: err.message });
    }
  }

  if (config.gotify.enabled) {
    try {
      await gotify.send({ title, message, priority: config.gotify.priority });
      results.push({ provider: 'gotify', ok: true });
    } catch (err) {
      results.push({ provider: 'gotify', ok: false, error: err.message });
    }
  }

  if (results.length === 0) {
    results.push({ provider: 'none', ok: false, error: 'No provider enabled' });
  }

  return results;
}

module.exports = { send, sendTest, formatMessage };
