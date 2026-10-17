export interface NotificationPayload {
  title: string;
  body: string;
  url: string;
  icon: string;
  /** Notifications with the same tag replace each other on the device. */
  tag: string;
}

export interface PushResult {
  status: 'sent' | 'skipped' | 'failed';
  sent?: number;
  failed?: number;
  error?: string;
}
