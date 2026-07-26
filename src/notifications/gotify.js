const axios = require('axios');
const { getNotificationConfig } = require('./config');

async function send({ title, message, priority }) {
  const config = getNotificationConfig().gotify;

  if (!config.enabled || !config.url || !config.token) {
    console.log('Gotify skipped: disabled or URL/token not set');
    return;
  }

  await axios.post(`${config.url}/message?token=${config.token}`, {
    title,
    message,
    priority: priority || config.priority
  });
  console.log('Gotify notification sent');
}

module.exports = { send };
