import { api } from './api.js';

export interface StatusData {
  status: string;
  isReady: boolean;
  health: {
    whatsapp: { ok: boolean; detail: string };
    puppeteer: { ok: boolean; detail: string };
    chrome: { ok: boolean; detail: string };
  };
  nextScan: string | null;
  settings: Record<string, string>;
}

export async function fetchStatus(): Promise<StatusData> {
  return api.get<StatusData>('/status');
}

export function formatNextScan(nextScan: string | Date | null): string {
  if (!nextScan) return '—';
  const date = typeof nextScan === 'string' ? new Date(nextScan) : nextScan;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
