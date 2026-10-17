export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: number;
  level: LogLevel;
  message: string;
}

export interface ChatStateRow {
  id: string;
  name: string;
  state: string;
  until: number | null;
  created_at: number;
}

export interface ReminderRow {
  id: number;
  chat_id: string;
  chat_name: string;
  sent_at: number;
}

export interface ScanLogRow {
  id: number;
  run_at: number;
  chats_checked: number;
  reminders_sent: number;
  error: string | null;
}

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface ChatLastMessage {
  fromMe: boolean;
  timestamp: number;
  timestampMs: number;
  hasReactionFromMe?: boolean;
}

export interface RawChat {
  id: string;
  name: string;
  isGroup: boolean;
  isArchived: boolean;
  isMuted: boolean;
  lastMessage: ChatLastMessage | null;
}

export interface ForgottenChat {
  id: string;
  name: string;
  lastMessageAt: number;
  hoursSince: number | null;
}

export interface WhatsAppStatus {
  status: string;
  isReady: boolean;
  /** When the next automatic reconnect attempt runs (epoch ms), or null. */
  reconnectAt: number | null;
}

export interface HealthCheck {
  ok: boolean;
  detail: string;
}

export interface WhatsAppHealth {
  whatsapp: HealthCheck;
  puppeteer: HealthCheck;
  chrome: HealthCheck;
}

export interface SettingsMap {
  interval_minutes: string;
  chat_limit: string;
  threshold_hours: string;
  log_level: string;
  [key: string]: string | undefined;
}
