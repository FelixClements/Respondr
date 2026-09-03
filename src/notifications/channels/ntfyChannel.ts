import axios from 'axios';
import { resolveWebhookUrl } from '../../lib/outboundUrl.js';
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
      const checked = await resolveWebhookUrl(config.server);
      if (!checked.ok) {
        return { channel: 'ntfy', status: 'failed', error: checked.error };
      }
      const base = checked.href.replace(/\/+$/, '');
      await axios.post(`${base}/${config.topic}`, payload.body, {
        headers: {
          Title: payload.title,
          Priority: String(config.priority)
        },
        maxRedirects: 0,
        timeout: 10_000
      });
      return { channel: 'ntfy', status: 'sent' };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { channel: 'ntfy', status: 'failed', error };
    }
  }
};
