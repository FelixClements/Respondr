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

/** Same shape as NotificationSettingsDto; omitted sections and fields stay unchanged. */
export interface NotificationSettingsUpdate {
  ntfy?: Partial<Record<keyof NotificationSettingsDto['ntfy'], unknown>>;
  gotify?: Partial<Record<keyof NotificationSettingsDto['gotify'], unknown>>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertEnabledFlag(value: unknown, channel: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${channel} enabled must be true or false`);
  return value;
}

/**
 * Validates every field first, then writes them in one transaction, so a bad
 * field rejects the whole update instead of leaving it half-saved.
 */
export function updateNotificationSettings(update: unknown): NotificationSettingsDto {
  if (!isPlainObject(update)) throw new Error('Invalid notification settings body');
  const { ntfy = {}, gotify = {} } = update as NotificationSettingsUpdate;
  if (!isPlainObject(ntfy) || !isPlainObject(gotify)) {
    throw new Error('Invalid notification settings body');
  }

  const writes: Array<[string, string]> = [];

  if (ntfy.enabled !== undefined) {
    writes.push(['ntfy_enabled', assertEnabledFlag(ntfy.enabled, 'NTFY') ? '1' : '0']);
  }
  if (ntfy.server !== undefined) {
    const server = String(ntfy.server).trim();
    assertWebhookUrl(server);
    writes.push(['ntfy_server', server]);
  }
  if (ntfy.topic !== undefined) {
    const topic = String(ntfy.topic).trim();
    assertNtfyTopic(topic);
    writes.push(['ntfy_topic', topic]);
  }
  if (ntfy.priority !== undefined) {
    writes.push(['ntfy_priority', String(clampNtfyPriority(ntfy.priority))]);
  }

  if (gotify.enabled !== undefined) {
    writes.push(['gotify_enabled', assertEnabledFlag(gotify.enabled, 'Gotify') ? '1' : '0']);
  }
  if (gotify.url !== undefined) {
    const url = String(gotify.url).trim();
    assertWebhookUrl(url);
    writes.push(['gotify_url', url]);
  }
  if (gotify.token !== undefined) {
    writes.push(['gotify_token', String(gotify.token).trim()]);
  }
  if (gotify.priority !== undefined) {
    writes.push(['gotify_priority', String(clampGotifyPriority(gotify.priority))]);
  }

  settingsDb.setMany(writes);
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
