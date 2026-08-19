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
