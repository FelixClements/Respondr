import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';

export type UrlCheck = { ok: true; href: string } | { ok: false; error: string };

export type PinnedAgentResult =
  | {
      ok: true;
      href: string;
      pinnedIp: string;
      httpAgent?: http.Agent;
      httpsAgent?: https.Agent;
    }
  | {
      ok: false;
      error: string;
    };

const PUSH_HOST_SUFFIXES = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  'notify.windows.com',
  'push.apple.com'
];

const BLOCKED_HOSTNAMES = new Set(['metadata.google.internal', 'metadata.goog']);

function fail(error: string): UrlCheck {
  return { ok: false, error };
}

function ok(href: string): UrlCheck {
  return { ok: true, href };
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

function stripIpv6Brackets(hostname: string): string {
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

function ipv4Octets(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums;
}

function mappedIpv4(ip: string): string | null {
  const lower = ip.toLowerCase();
  const prefix = '::ffff:';
  if (!lower.startsWith(prefix)) return null;
  return lower.slice(prefix.length);
}

function isLinkLocalIpv4(ip: string): boolean {
  const octets = ipv4Octets(ip);
  return octets !== null && octets[0] === 169 && octets[1] === 254;
}

function isLinkLocalIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === 'fd00:ec2::254') return true;
  const first = lower.split(':', 1)[0] || '';
  if (!/^[0-9a-f]{1,4}$/.test(first)) return false;
  const n = parseInt(first, 16);
  return n >= 0xfe80 && n <= 0xfebf;
}

function isBlockedAddress(address: string): boolean {
  const mapped = mappedIpv4(address);
  if (mapped) return isBlockedAddress(mapped);
  const version = isIP(address);
  if (version === 4) return isLinkLocalIpv4(address);
  if (version === 6) return isLinkLocalIpv6(address);
  return isLinkLocalIpv4(address);
}

function isBlockedHostname(hostname: string): boolean {
  const host = normalizeHostname(stripIpv6Brackets(hostname));
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  return isBlockedAddress(host);
}

function parseHttpUrl(raw: string): UrlCheck & { url?: URL } {
  const trimmed = raw.trim();
  if (!trimmed) return ok('');
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return fail('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return fail('URL must be http or https');
  }
  if (isBlockedHostname(url.hostname)) {
    return fail('URL host is not allowed');
  }
  return { ok: true, href: url.href, url };
}

export function checkWebhookUrl(raw: string): UrlCheck {
  const parsed = parseHttpUrl(raw);
  if (!parsed.ok) return parsed;
  return ok(parsed.href);
}

function hostnameMatchesSuffix(hostname: string, suffix: string): boolean {
  const host = normalizeHostname(hostname);
  return host === suffix || host.endsWith(`.${suffix}`);
}

export function checkPushEndpoint(raw: string): UrlCheck {
  const parsed = parseHttpUrl(raw);
  if (!parsed.ok) return parsed;
  if (!parsed.href) return fail('Push endpoint is required');
  const url = new URL(parsed.href);
  if (url.protocol !== 'https:') {
    return fail('Push endpoint must be https');
  }
  const allowed = PUSH_HOST_SUFFIXES.some((suffix) => hostnameMatchesSuffix(url.hostname, suffix));
  if (!allowed) {
    return fail('Push endpoint host is not allowed');
  }
  return ok(url.href);
}

export async function resolveWebhookUrl(raw: string): Promise<UrlCheck> {
  const parsed = parseHttpUrl(raw);
  if (!parsed.ok) return parsed;
  if (!parsed.href || !parsed.url) return ok('');

  const hostname = stripIpv6Brackets(parsed.url.hostname);
  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) return fail('URL host is not allowed');
    return ok(parsed.href);
  }

  try {
    const records = await lookup(hostname, { all: true });
    const addresses = Array.isArray(records) ? records : [records];
    for (const record of addresses) {
      if (isBlockedAddress(record.address)) {
        return fail('URL host is not allowed');
      }
    }
    return ok(parsed.href);
  } catch {
    return fail('URL host could not be resolved');
  }
}

export async function createPinnedAgent(raw: string): Promise<PinnedAgentResult> {
  const parsed = parseHttpUrl(raw);
  if (!parsed.ok) return parsed;
  if (!parsed.href || !parsed.url) {
    return { ok: false, error: 'Target URL is required' };
  }

  const hostname = stripIpv6Brackets(parsed.url.hostname);
  let resolvedIp: string;
  let family: number;

  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      return { ok: false, error: 'URL host is not allowed' };
    }
    resolvedIp = hostname;
    family = isIP(hostname);
  } else {
    try {
      const records = await lookup(hostname, { all: true });
      const addresses = Array.isArray(records) ? records : [records];
      if (addresses.length === 0) {
        return { ok: false, error: 'URL host could not be resolved' };
      }
      for (const record of addresses) {
        if (isBlockedAddress(record.address)) {
          return { ok: false, error: 'URL host is not allowed' };
        }
      }
      resolvedIp = addresses[0].address;
      family = addresses[0].family;
    } catch {
      return { ok: false, error: 'URL host could not be resolved' };
    }
  }

  const customLookup = (
    _host: string,
    _opts: unknown,
    cb: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
  ) => {
    cb(null, resolvedIp, family);
  };

  const isHttps = parsed.url.protocol === 'https:';
  if (isHttps) {
    const httpsAgent = new https.Agent({
      lookup: customLookup as any,
      servername: hostname
    });
    return {
      ok: true,
      href: parsed.href,
      pinnedIp: resolvedIp,
      httpsAgent
    };
  } else {
    const httpAgent = new http.Agent({
      lookup: customLookup as any
    });
    return {
      ok: true,
      href: parsed.href,
      pinnedIp: resolvedIp,
      httpAgent
    };
  }
}
