import * as logger from '../lib/logger.js';
import type {
  NotificationChannel,
  NotificationPayload,
  DeliveryReport,
  ChannelOutcome
} from './types.js';

export function createDispatcher(channels: NotificationChannel[]) {
  async function dispatch(payload: NotificationPayload): Promise<DeliveryReport> {
    const outcomes: ChannelOutcome[] = [];

    for (const channel of channels) {
      if (!channel.isAvailable()) {
        outcomes.push({ channel: channel.id, status: 'skipped' });
        continue;
      }
      try {
        outcomes.push(await channel.send(payload));
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        outcomes.push({ channel: channel.id, status: 'failed', error });
      }
    }

    if (outcomes.length === 0) {
      outcomes.push({ channel: 'none', status: 'skipped', error: 'No channels configured' });
    }

    const anySent = outcomes.some((o) => o.status === 'sent');
    return { outcomes, anySent };
  }

  async function dispatchReminder(payload: NotificationPayload): Promise<void> {
    const report = await dispatch(payload);
    for (const outcome of report.outcomes) {
      if (outcome.status === 'failed') {
        logger.error(
          `Notification channel ${outcome.channel} failed: ${outcome.error || 'unknown'}`
        );
      }
    }
  }

  return { dispatch, dispatchReminder };
}
