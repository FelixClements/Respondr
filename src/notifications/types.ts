import type { ForgottenChat } from '../types.js';

export type ChannelId = 'ntfy' | 'gotify' | 'web-push';

export interface NotificationPayload {
  title: string;
  body: string;
  url: string;
  icon: string;
}

export interface ChannelOutcome {
  channel: ChannelId | 'none';
  status: 'sent' | 'skipped' | 'failed';
  sent?: number;
  failed?: number;
  error?: string;
}

export interface DeliveryReport {
  outcomes: ChannelOutcome[];
  anySent: boolean;
}

export interface NotificationChannel {
  readonly id: ChannelId;
  isAvailable(): boolean;
  send(payload: NotificationPayload): Promise<ChannelOutcome>;
}

export type { ForgottenChat };
