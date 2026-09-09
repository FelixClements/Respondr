// Shared API contracts mirroring backend DTOs (src/types.ts,
// src/notifications/settings.ts, src/application/appServices.ts).
// Keep in sync: backend is the source of truth; this file is the web copy
// with a type test in tests/ (see contracts drift test).

export interface EnrichedChatContract {
  id: string;
  name: string;
  isGroup: boolean;
  isArchived: boolean;
  isMuted: boolean;
  lastMessage: {
    fromMe: boolean;
    timestamp: number;
    timestampMs: number;
    hasReactionFromMe?: boolean;
  } | null;
  hoursSince: number | null;
  needsReply: boolean;
  state: { state: string; until: number | null; createdAt: number } | null;
}

export interface NotificationSettingsContract {
  ntfy: { enabled: boolean; server: string; topic: string; priority: number };
  gotify: { enabled: boolean; url: string; token: string; priority: number };
}

export interface StatusPayloadContract {
  status: string;
  isReady: boolean;
  health: unknown;
  nextScan: Date | string | null;
  settings: Record<string, string | undefined>;
}

export interface CoreSettingsContract {
  interval_minutes: string;
  chat_limit: string;
  threshold_hours: string;
  log_level: string;
}
