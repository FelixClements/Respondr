import * as settingsDb from '../db/settings.js';

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

export function getNotificationConfig() {
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

export function seedFromEnv(): void {
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
