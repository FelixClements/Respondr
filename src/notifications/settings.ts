import * as settingsDb from '../db/settings.js';
import { checkWebhookUrl } from '../lib/outboundUrl.js';
import * as logger from '../lib/logger.js';
import {
  assertNtfyTopic,
  clampGotifyPriority,
  clampNtfyPriority,
  NTFY_TOPIC_PATTERN
} from './ntfyTopic.js';

export { NTFY_TOPIC_PATTERN };

function assertWebhookUrl(raw: string): void {
  const check = checkWebhookUrl(raw);
  if (!check.ok) throw new Error(check.error);
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
    const server = String(input.ntfy_server).trim();
    assertWebhookUrl(server);
    settingsDb.set('ntfy_server', server);
  }
  if (input.ntfy_topic !== undefined) {
    const topic = String(input.ntfy_topic).trim();
    assertNtfyTopic(topic);
    settingsDb.set('ntfy_topic', topic);
  }
  if (input.ntfy_priority !== undefined) {
    settingsDb.set('ntfy_priority', String(clampNtfyPriority(input.ntfy_priority)));
  }

  if (input.gotify_enabled !== undefined) {
    settingsDb.set('gotify_enabled', input.gotify_enabled ? '1' : '0');
  }
  if (input.gotify_url !== undefined) {
    const url = String(input.gotify_url).trim();
    assertWebhookUrl(url);
    settingsDb.set('gotify_url', url);
  }
  if (input.gotify_token !== undefined) {
    settingsDb.set('gotify_token', String(input.gotify_token).trim());
  }
  if (input.gotify_priority !== undefined) {
    settingsDb.set('gotify_priority', String(clampGotifyPriority(input.gotify_priority)));
  }

  return getNotificationSettings();
}

export function seedNotificationSettingsFromEnv(): void {
  const ntfySeeded = settingsDb.has('ntfy_server') || settingsDb.has('ntfy_topic');
  const gotifySeeded = settingsDb.has('gotify_url') || settingsDb.has('gotify_token');

  if (!ntfySeeded) {
    const server = process.env.NTFY_SERVER || 'https://ntfy.sh';
    const rawTopic = (process.env.NTFY_TOPIC || '').trim();
    let topic = '';
    let enabled = false;
    try {
      assertNtfyTopic(rawTopic);
      if (rawTopic) {
        const serverCheck = checkWebhookUrl(server);
        if (!serverCheck.ok) throw new Error(serverCheck.error);
        topic = rawTopic;
        enabled = true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Invalid NTFY_TOPIC/NTFY_SERVER in env, notifications disabled: ${message}`);
    }
    let priority = 3;
    try {
      priority = clampNtfyPriority(process.env.NTFY_PRIORITY || 3);
    } catch {
      logger.warn('Invalid NTFY_PRIORITY in env, defaulting to 3');
    }
    settingsDb.set('ntfy_enabled', enabled ? '1' : '0');
    settingsDb.set('ntfy_server', server);
    settingsDb.set('ntfy_topic', topic);
    settingsDb.set('ntfy_priority', String(priority));
  }

  if (!gotifySeeded) {
    const url = (process.env.GOTIFY_URL || '').trim();
    const token = (process.env.GOTIFY_TOKEN || '').trim();
    let enabled = false;
    if (url || token) {
      try {
        if (!url) throw new Error('GOTIFY_URL is required when GOTIFY_TOKEN is set');
        const urlCheck = checkWebhookUrl(url);
        if (!urlCheck.ok) throw new Error(urlCheck.error);
        if (!token) throw new Error('GOTIFY_TOKEN is required when GOTIFY_URL is set');
        enabled = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(`Invalid GOTIFY_URL/GOTIFY_TOKEN in env, notifications disabled: ${message}`);
      }
    }
    let priority = 5;
    try {
      priority = clampGotifyPriority(process.env.GOTIFY_PRIORITY || 5);
    } catch {
      logger.warn('Invalid GOTIFY_PRIORITY in env, defaulting to 5');
    }
    settingsDb.set('gotify_enabled', enabled ? '1' : '0');
    settingsDb.set('gotify_url', enabled ? url : '');
    settingsDb.set('gotify_token', enabled ? token : '');
    settingsDb.set('gotify_priority', String(priority));
  }
}
