import axios from 'axios';
import { getNotificationSettings } from '../settings.js';
import type { NotificationChannel, NotificationPayload, ChannelOutcome } from '../types.js';

export const ntfyChannel: NotificationChannel = {
  id: 'ntfy',

  isAvailable() {
    const config = getNotificationSettings().ntfy;
    return config.enabled && Boolean(config.topic);
  },

  async send(payload: NotificationPayload): Promise<ChannelOutcome> {
    const config = getNotificationSettings().ntfy;
    try {
      const url = `${config.server}/${config.topic}`;
      await axios.post(url, payload.body, {
        headers: {
          Title: payload.title,
          Priority: String(config.priority)
        }
      });
      return { channel: 'ntfy', status: 'sent' };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { channel: 'ntfy', status: 'failed', error };
    }
  }
};
