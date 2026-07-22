const axios = require('axios');

async function send({ title, message, priority = 3 }) {
  const topic = process.env.NTFY_TOPIC;
  const server = process.env.NTFY_SERVER || 'https://ntfy.sh';

  if (!topic) {
    console.log('NTFY skipped: NTFY_TOPIC not set');
    return;
  }

  const url = `${server}/${topic}`;
  await axios.post(url, message, {
    headers: {
      Title: title,
      Priority: String(priority)
    }
  });
  console.log(`NTFY notification sent to ${topic}`);
}

module.exports = { send };
