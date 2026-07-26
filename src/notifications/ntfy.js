const axios = require('axios');
const { getNotificationConfig } = require('./config');

async function send({ title, message, priority }) {
  const config = getNotificationConfig().ntfy;

  if (!config.enabled || !config.topic) {
    console.log('NTFY skipped: disabled or topic not set');
    return;
  }

  const url = `${config.server}/${config.topic}`;
  await axios.post(url, message, {
    headers: {
      Title: title,
      Priority: String(priority || config.priority)
    }
  });
  console.log(`NTFY notification sent to ${config.topic}`);
}

module.exports = { send };
