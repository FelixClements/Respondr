export type UrlCheck = { ok: true; href: string } | { ok: false; error: string };

// Browser push services. Subscriptions may only point here, so the server
// never sends to an attacker-chosen host.
const PUSH_HOST_SUFFIXES = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  'notify.windows.com',
  'push.apple.com'
];

function hostnameMatchesSuffix(hostname: string, suffix: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  return host === suffix || host.endsWith(`.${suffix}`);
}

export function checkPushEndpoint(raw: string): UrlCheck {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: 'Push endpoint is required' };
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }
  if (url.protocol !== 'https:') {
    return { ok: false, error: 'Push endpoint must be https' };
  }
  const allowed = PUSH_HOST_SUFFIXES.some((suffix) => hostnameMatchesSuffix(url.hostname, suffix));
  if (!allowed) {
    return { ok: false, error: 'Push endpoint host is not allowed' };
  }
  return { ok: true, href: url.href };
}

function isBase64Url(value: string): boolean {
  return /^[A-Za-z0-9\-_]+={0,2}$/.test(value);
}

export function checkPushKeys(
  p256dh: string,
  auth: string
): { ok: true } | { ok: false; error: string } {
  if (!isBase64Url(p256dh) || p256dh.length < 80 || p256dh.length > 90) {
    return { ok: false, error: 'Invalid push p256dh key' };
  }
  if (!isBase64Url(auth) || auth.length < 20 || auth.length > 28) {
    return { ok: false, error: 'Invalid push auth key' };
  }
  return { ok: true };
}
