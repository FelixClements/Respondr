import * as settingsDb from '../db/settings.js';

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

function getBool(key: string, defaultValue = false): boolean {
  const value = settingsDb.get(key);
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function getString(key: string, defaultValue = ''): string {
  const value = settingsDb.get(key);
  return value !== undefined && value !== null ? value : defaultValue;
}

function getInt(key: string, defaultValue = 0): number {
  const value = parseInt(getString(key, ''), 10);
  return Number.isFinite(value) ? value : defaultValue;
}

export function getNotificationSettings(): NotificationSettingsDto {
  return {
    ntfy: {
      enabled: getBool('ntfy_enabled', false),
      server: getString('ntfy_server', 'https://ntfy.sh'),
      topic: getString('ntfy_topic', ''),
      priority: getInt('ntfy_priority', 3)
    },
    gotify: {
      enabled: getBool('gotify_enabled', false),
      url: getString('gotify_url', ''),
      token: getString('gotify_token', ''),
      priority: getInt('gotify_priority', 5)
    }
  };
}

export function updateNotificationSettings(input: {
  ntfy_enabled?: boolean;
  ntfy_server?: string;
  ntfy_topic?: string;
  ntfy_priority?: number;
  gotify_enabled?: boolean;
  gotify_url?: string;
  gotify_token?: string;
  gotify_priority?: number;
}): NotificationSettingsDto {
  if (input.ntfy_enabled !== undefined) {
    settingsDb.set('ntfy_enabled', input.ntfy_enabled ? '1' : '0');
  }
  if (input.ntfy_server !== undefined) {
    settingsDb.set('ntfy_server', String(input.ntfy_server).trim());
  }
  if (input.ntfy_topic !== undefined) {
    settingsDb.set('ntfy_topic', String(input.ntfy_topic).trim());
  }
  if (input.ntfy_priority !== undefined) {
    settingsDb.set('ntfy_priority', String(input.ntfy_priority));
  }

  if (input.gotify_enabled !== undefined) {
    settingsDb.set('gotify_enabled', input.gotify_enabled ? '1' : '0');
  }
  if (input.gotify_url !== undefined) {
    settingsDb.set('gotify_url', String(input.gotify_url).trim());
  }
  if (input.gotify_token !== undefined) {
    settingsDb.set('gotify_token', String(input.gotify_token).trim());
  }
  if (input.gotify_priority !== undefined) {
    settingsDb.set('gotify_priority', String(input.gotify_priority));
  }

  return getNotificationSettings();
}

export function seedNotificationSettingsFromEnv(): void {
  const ntfySeeded = settingsDb.has('ntfy_server') || settingsDb.has('ntfy_topic');
  const gotifySeeded = settingsDb.has('gotify_url') || settingsDb.has('gotify_token');

  if (!ntfySeeded) {
    const server = process.env.NTFY_SERVER || 'https://ntfy.sh';
    const topic = process.env.NTFY_TOPIC || '';
    settingsDb.set('ntfy_enabled', topic ? '1' : '0');
    settingsDb.set('ntfy_server', server);
    settingsDb.set('ntfy_topic', topic);
    settingsDb.set('ntfy_priority', String(parseInt(process.env.NTFY_PRIORITY || '', 10) || 3));
  }

  if (!gotifySeeded) {
    const url = process.env.GOTIFY_URL || '';
    const token = process.env.GOTIFY_TOKEN || '';
    settingsDb.set('gotify_enabled', token ? '1' : '0');
    settingsDb.set('gotify_url', url);
    settingsDb.set('gotify_token', token);
    settingsDb.set('gotify_priority', String(parseInt(process.env.GOTIFY_PRIORITY || '', 10) || 5));
  }
}
