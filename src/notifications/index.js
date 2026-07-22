const ntfy = require('./ntfy');
const gotify = require('./gotify');

function formatMessage(chat) {
  const hours = typeof chat.hoursSince === 'number' ? chat.hoursSince.toFixed(1) : 'several';
  return `${chat.name}: no reply for ${hours} hours`;
}

async function send(chat) {
  const title = 'Respondr reminder';
  const message = formatMessage(chat);

  await Promise.all([
    ntfy.send({
      title,
      message,
      priority: parseInt(process.env.NTFY_PRIORITY, 10) || 3
    }),
    gotify.send({
      title,
      message,
      priority: parseInt(process.env.GOTIFY_PRIORITY, 10) || 5
    })
  ]);
}

module.exports = { send, formatMessage };
