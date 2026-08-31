import axios from 'axios';
import { getNotificationSettings } from '../settings.js';
import type { NotificationChannel, NotificationPayload, ChannelOutcome } from '../types.js';

export const gotifyChannel: NotificationChannel = {
  id: 'gotify',

  isAvailable() {
    const config = getNotificationSettings().gotify;
    return config.enabled && Boolean(config.url) && Boolean(config.token);
  },

  async send(payload: NotificationPayload): Promise<ChannelOutcome> {
    const config = getNotificationSettings().gotify;
    try {
      await axios.post(`${config.url}/message`, {
        title: payload.title,
        message: payload.body,
        priority: config.priority
      }, {
        headers: {
          'X-Gotify-Key': config.token
        }
      });
      return { channel: 'gotify', status: 'sent' };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { channel: 'gotify', status: 'failed', error };
    }
  }
};
