import axios from 'axios';
import { resolveWebhookUrl } from '../../lib/outboundUrl.js';
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
      const checked = await resolveWebhookUrl(config.url);
      if (!checked.ok) {
        return { channel: 'gotify', status: 'failed', error: checked.error };
      }
      const base = checked.href.replace(/\/+$/, '');
      await axios.post(
        `${base}/message`,
        {
          title: payload.title,
          message: payload.body,
          priority: config.priority
        },
        {
          headers: {
            'X-Gotify-Key': config.token
          },
          maxRedirects: 0,
          timeout: 10_000
        }
      );
      return { channel: 'gotify', status: 'sent' };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { channel: 'gotify', status: 'failed', error };
    }
  }
};
