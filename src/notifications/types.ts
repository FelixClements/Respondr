export interface NotificationPayload {
  title: string;
  body: string;
  url: string;
  icon: string;
}

export interface PushResult {
  status: 'sent' | 'skipped' | 'failed';
  sent?: number;
  failed?: number;
  error?: string;
}
