export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

export interface NotificationSettingsDto {
  ntfy: {
    enabled: boolean;
    server: string;
    topic: string;
    priority: number;
  };
  gotify: {
    enabled: boolean;
    url: string;
    token: string;
    priority: number;
  };
}

export interface PushConfigDto {
  publicKey: string | null;
  configured: boolean;
}
