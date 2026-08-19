import axios from 'axios';
import { getNotificationConfig } from './config.js';

export async function send({
  title,
  message,
  priority
}: {
  title: string;
  message: string;
  priority?: number;
}): Promise<void> {
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
