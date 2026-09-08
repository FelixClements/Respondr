import * as settingsDb from '../db/settings.js';
import * as chatStateDb from '../db/chatState.js';
import * as historyDb from '../db/history.js';
import * as pushSubscriptionsDb from '../db/pushSubscriptions.js';
import * as reminderDiscovery from '../domain/reminderDiscovery.js';
import { runOnce } from '../engine/runner.js';
import { sendTest } from '../notifications/index.js';
import { getNotificationSettings, updateNotificationSettings } from '../notifications/settings.js';
import { webPushChannel, getVapidPublicKey } from '../notifications/channels/webPushChannel.js';
import { checkPushEndpoint } from '../lib/outboundUrl.js';
import * as scheduler from '../scheduler.js';
import * as logger from '../lib/logger.js';
import type { AppDeps } from '../whatsapp/create.js';

import type { SettingsMap } from '../types.js';

function filterCoreSettings(all: SettingsMap): SettingsMap {
  return {
    interval_minutes: all.interval_minutes,
    chat_limit: all.chat_limit,
    threshold_hours: all.threshold_hours,
    log_level: all.log_level
  };
}

function workflowMap() {
  const stateById: Record<string, reminderDiscovery.ChatWorkflowState | undefined> = {};
  for (const row of chatStateDb.list()) {
    stateById[row.id] = {
      state: row.state,
      until: row.until,
      createdAt: row.created_at
    };
  }
  return stateById;
}

export function createAppServices(deps: AppDeps) {
  const { chatSource, whatsapp } = deps;
  let isReconnecting = false;

  return {
    getStatusPayload() {
      const status = whatsapp.getStatus();
      let health = null;
      try {
        health = whatsapp.getHealth();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Health check failed: ${message}`);
        health = {
          whatsapp: { ok: false, detail: status.status },
          puppeteer: { ok: false, detail: message },
          chrome: { ok: false, detail: 'health check failed' }
        };
      }
      return {
        status: status.status,
        isReady: status.isReady,
        health,
        nextScan: scheduler.getNextRunAt(),
        settings: filterCoreSettings(settingsDb.getAll())
      };
    },

    async getDashboard() {
      const status = whatsapp.getStatus();
      const recentReminders = historyDb.getRecentReminders(5);
      const recentScans = historyDb.getRecentScans(1);
      const settings = settingsDb.getAll();
      const thresholdHours = parseFloat(settings.threshold_hours || '3') || 3;
      const limit = parseInt(settings.chat_limit || '50', 10) || 50;

      const stateCounts = { ignored: 0, done: 0 };
      for (const row of chatStateDb.list()) {
        if (row.state in stateCounts) {
          stateCounts[row.state as keyof typeof stateCounts]++;
        }
      }

      const now = Date.now();
      const stats = {
        total: null as number | null,
        urgent: null as number | null,
        snoozed: stateCounts.ignored + stateCounts.done
      };

      try {
        const raw = await chatSource.getRecentChats(limit);
        const analysis = reminderDiscovery.statsForChats(raw, workflowMap(), thresholdHours, now);
        stats.total = analysis.total;
        stats.urgent = analysis.urgent;
      } catch {
        /* stats remain null */
      }

      return {
        status,
        recentReminders,
        stats,
        lastScan: recentScans[0] || null,
        nextScan: scheduler.getNextRunAt()
      };
    },

    async getChats() {
      const settings = settingsDb.getAll();
      const thresholdHours = parseFloat(settings.threshold_hours || '3') || 3;
      const limit = parseInt(settings.chat_limit || '50', 10) || 50;
      const status = whatsapp.getStatus();

      try {
        const raw = await chatSource.getRecentChats(limit);
        const stateById = workflowMap();
        const now = Date.now();
        const chats = raw.map((chat) =>
          reminderDiscovery.enrichChat(chat, stateById[chat.id] || null, thresholdHours, now)
        );
        return { chats, status, nextScan: scheduler.getNextRunAt() };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { chats: [], error: message, status, nextScan: scheduler.getNextRunAt() };
      }
    },

    markDone(id: string, name: string) {
      chatStateDb.add(id, name, 'done');
      return { ok: true as const };
    },

    markUndone(id: string) {
      chatStateDb.remove(id);
      return { ok: true as const };
    },

    markIgnored(id: string, name: string) {
      chatStateDb.add(id, name, 'ignored');
      return { ok: true as const };
    },

    markUnignored(id: string) {
      chatStateDb.remove(id);
      return { ok: true as const };
    },

    getCoreSettings() {
      return filterCoreSettings(settingsDb.getAll());
    },

    updateCoreSettings(body: Record<string, unknown>) {
      const interval = parseInt(String(body.interval_minutes), 10);
      const limit = parseInt(String(body.chat_limit), 10);
      const threshold = parseInt(String(body.threshold_hours), 10);

      if (!Number.isFinite(interval) || interval < 1) {
        return { error: 'Scan interval must be at least 1 minute', status: 400 as const };
      }
      if (!Number.isFinite(limit) || limit < 1) {
        return { error: 'Chat limit must be at least 1', status: 400 as const };
      }
      if (!Number.isFinite(threshold) || threshold < 1) {
        return { error: 'Threshold must be at least 1 hour', status: 400 as const };
      }

      settingsDb.set('interval_minutes', interval);
      settingsDb.set('chat_limit', limit);
      settingsDb.set('threshold_hours', threshold);
      try {
        scheduler.reschedule();
      } catch (err) {
        logger.error(`Failed to reschedule: ${err}`);
      }
      return { data: filterCoreSettings(settingsDb.getAll()), status: 200 as const };
    },

    getNotifications() {
      return getNotificationSettings();
    },

    updateNotifications(body: Record<string, unknown>) {
      return updateNotificationSettings({
        ntfy_enabled: body.ntfy_enabled === true || body.ntfy_enabled === '1',
        ntfy_server: body.ntfy_server as string | undefined,
        ntfy_topic: body.ntfy_topic as string | undefined,
        ntfy_priority: parseInt(String(body.ntfy_priority), 10),
        gotify_enabled: body.gotify_enabled === true || body.gotify_enabled === '1',
        gotify_url: body.gotify_url as string | undefined,
        gotify_token: body.gotify_token as string | undefined,
        gotify_priority: parseInt(String(body.gotify_priority), 10)
      });
    },

    getHistory() {
      return {
        reminders: historyDb.getRecentReminders(50),
        scans: historyDb.getRecentScans(50)
      };
    },

    getQr() {
      return { status: whatsapp.getStatus(), qr: whatsapp.getQrDataUrl() };
    },

    async sendTestNotification(title: string, message: string) {
      const results = await sendTest(title, message);
      return { ok: true as const, results };
    },

    runScan: runOnce,

    async reconnect() {
      if (isReconnecting) {
        return {
          ok: false as const,
          error: 'Reconnection already in progress',
          status: whatsapp.getStatus()
        };
      }
      isReconnecting = true;
      logger.info('Reconnect requested from dashboard');
      try {
        await whatsapp.restartClient();
        return { ok: true as const, status: whatsapp.getStatus() };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Reconnect failed: ${message}`);
        return { ok: false as const, error: message, status: whatsapp.getStatus() };
      } finally {
        isReconnecting = false;
      }
    },

    subscribePush(sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }) {
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
        return { ok: false as const, error: 'Invalid subscription', status: 400 as const };
      }
      const endpointCheck = checkPushEndpoint(sub.endpoint);
      if (!endpointCheck.ok) {
        return { ok: false as const, error: endpointCheck.error, status: 400 as const };
      }
      pushSubscriptionsDb.addPushSubscription({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }
      });
      return { ok: true as const, status: 200 as const };
    },

    unsubscribePush(endpoint?: string) {
      if (!endpoint) {
        return { ok: false as const, error: 'Invalid subscription', status: 400 as const };
      }
      pushSubscriptionsDb.removePushSubscription(endpoint);
      return { ok: true as const, status: 200 as const };
    },

    getPushConfig() {
      const publicKey = getVapidPublicKey();
      if (!publicKey) return { publicKey: null, configured: false };
      return { publicKey, configured: true };
    },

    async testPush() {
      const result = await webPushChannel.send({
        title: 'Respondr test',
        body: 'Push notifications are working',
        url: '/',
        icon: '/icon-192.png'
      });
      return { ok: true as const, result };
    },

    getLogs(level: string | undefined, limit: number) {
      const resolvedLevel = level || settingsDb.get('log_level');
      return {
        level: logger.getLevel(),
        logs: logger.getLogs({ level: resolvedLevel, limit })
      };
    },

    updateLogLevel(level: string) {
      settingsDb.set('log_level', level);
      logger.setLevel(level);
      logger.info(`Log level changed to ${level}`);
      return { level: logger.getLevel() };
    }
  };
}

export type AppServices = ReturnType<typeof createAppServices>;
