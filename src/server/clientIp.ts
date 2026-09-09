import { isIP } from 'node:net';
import type { Context } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';

export function isTrustProxyEnabled(): boolean {
  const val = process.env.TRUST_PROXY?.trim().toLowerCase();
  return val === 'true' || val === '1';
}

export function isValidIp(value: string | undefined | null): boolean {
  if (!value) return false;
  return isIP(value.trim()) !== 0;
}

export function extractClientIp(c: Context): string {
  if (isTrustProxyEnabled()) {
    // Prefer the rightmost valid X-Forwarded-For entry: proxies append the
    // true client IP, so the rightmost value is the one our proxy added.
    // Leftmost values are client-controlled and must not be trusted.
    const forwarded = c.req.header('x-forwarded-for');
    if (forwarded) {
      const entries = forwarded
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0 && isValidIp(part));
      if (entries.length > 0) return entries[entries.length - 1];
    }

    // X-Real-IP only as fallback when valid; proxies must strip/overwrite it.
    const realIp = c.req.header('x-real-ip')?.trim();
    if (realIp && isValidIp(realIp)) return realIp;
  }

  try {
    const conn = getConnInfo(c);
    const remoteAddress = conn?.remote?.address?.trim();
    if (remoteAddress) return remoteAddress;
  } catch {
    // When invoked without an underlying Node HTTP server (e.g. test environments)
  }

  return '127.0.0.1';
}
