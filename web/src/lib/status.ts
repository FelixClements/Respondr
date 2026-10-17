import { api } from './api.js';

export interface WhatsAppStatus {
  status: string;
  isReady: boolean;
  /** Next automatic reconnect attempt (epoch ms), or null. */
  reconnectAt: number | null;
}

/** How often pages poll while WhatsApp is not connected. */
export const STATUS_POLL_MS = 3000;

export async function fetchWhatsAppStatus(): Promise<WhatsAppStatus> {
  const { status, isReady, reconnectAt } = await api.get<WhatsAppStatus>('/status');
  return { status, isReady, reconnectAt };
}

/** A QR scan, not a restart, is what fixes `awaiting_qr`. */
export function canReconnect(s: WhatsAppStatus): boolean {
  return !s.isReady && s.status !== 'awaiting_qr';
}

/** Starts a restart in the background; poll status for the outcome. */
export async function requestReconnect(): Promise<void> {
  await api.post('/reconnect');
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local 24-hour clock, 00–23. Never uses the locale's AM/PM cycle. */
function formatClock(date: Date, withSeconds: boolean): string {
  const hours = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return withSeconds ? `${hours}:${pad(date.getSeconds())}` : hours;
}

export function formatNextScan(nextScan: string | Date | null): string {
  if (!nextScan) return '—';
  const date = typeof nextScan === 'string' ? new Date(nextScan) : nextScan;
  if (Number.isNaN(date.getTime())) return '—';
  return formatClock(date, false);
}

export function formatDateTime(ts: number): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString()} ${formatClock(date, true)}`;
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ready: 'Connected',
    awaiting_qr: 'Scan QR code',
    authenticated: 'Authenticating…',
    initializing: 'Starting…',
    disconnected: 'Disconnected',
    puppeteer_error: 'Browser error',
    auth_failure: 'Auth failed'
  };
  return labels[status] || status;
}

export function statusColor(status: string): string {
  if (status === 'ready') return 'text-brand-success';
  if (status === 'awaiting_qr') return 'text-md-light-tertiary dark:text-md-dark-tertiary';
  return 'text-md-light-error dark:text-md-dark-error';
}
