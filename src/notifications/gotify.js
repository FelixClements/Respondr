const axios = require('axios');

async function send({ title, message, priority = 5 }) {
  const url = process.env.GOTIFY_URL;
  const token = process.env.GOTIFY_TOKEN;

  if (!url || !token) {
    console.log('Gotify skipped: GOTIFY_URL or GOTIFY_TOKEN not set');
    return;
  }

  await axios.post(`${url}/message?token=${token}`, {
    title,
    message,
    priority
  });
  console.log('Gotify notification sent');
}

module.exports = { send };
