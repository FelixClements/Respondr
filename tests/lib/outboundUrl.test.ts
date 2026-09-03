import { afterEach, describe, expect, it, vi } from 'vitest';

const lookupMock = vi.fn();

vi.mock('node:dns/promises', () => ({
  lookup: (...args: unknown[]) => lookupMock(...args)
}));

describe('checkWebhookUrl', () => {
  it('allows an empty string', async () => {
    const { checkWebhookUrl } = await import('../../src/lib/outboundUrl.js');
    expect(checkWebhookUrl('')).toEqual({ ok: true, href: '' });
    expect(checkWebhookUrl('   ')).toEqual({ ok: true, href: '' });
  });

  it('allows LAN http, docker DNS, and public https', async () => {
    const { checkWebhookUrl } = await import('../../src/lib/outboundUrl.js');
    expect(checkWebhookUrl('http://192.168.1.10:8080').ok).toBe(true);
    expect(checkWebhookUrl('http://gotify:80').ok).toBe(true);
    expect(checkWebhookUrl('https://ntfy.sh').ok).toBe(true);
  });

  it('rejects non-http schemes and cloud metadata', async () => {
    const { checkWebhookUrl } = await import('../../src/lib/outboundUrl.js');
    expect(checkWebhookUrl('file:///etc/passwd').ok).toBe(false);
    expect(checkWebhookUrl('gopher://example.com').ok).toBe(false);
    expect(checkWebhookUrl('http://169.254.169.254/').ok).toBe(false);
    expect(checkWebhookUrl('http://metadata.google.internal/').ok).toBe(false);
    expect(checkWebhookUrl('http://[fd00:ec2::254]/').ok).toBe(false);
  });
});

describe('checkPushEndpoint', () => {
  it('allows https endpoints on known push hosts', async () => {
    const { checkPushEndpoint } = await import('../../src/lib/outboundUrl.js');
    expect(checkPushEndpoint('https://fcm.googleapis.com/fcm/send/abc').ok).toBe(true);
    expect(checkPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc').ok).toBe(
      true
    );
    expect(checkPushEndpoint('https://web.push.apple.com/abc').ok).toBe(true);
    expect(checkPushEndpoint('https://wns2-par02p.notify.windows.com/w/?token=1').ok).toBe(true);
  });

  it('rejects http, unknown hosts, and metadata', async () => {
    const { checkPushEndpoint } = await import('../../src/lib/outboundUrl.js');
    expect(checkPushEndpoint('http://fcm.googleapis.com/fcm/send/abc').ok).toBe(false);
    expect(checkPushEndpoint('https://evil.example/push').ok).toBe(false);
    expect(checkPushEndpoint('https://169.254.169.254/').ok).toBe(false);
  });
});

describe('resolveWebhookUrl', () => {
  afterEach(() => {
    lookupMock.mockReset();
  });

  it('rejects a hostname that resolves to a metadata IP', async () => {
    lookupMock.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);
    const { resolveWebhookUrl } = await import('../../src/lib/outboundUrl.js');
    const result = await resolveWebhookUrl('http://evil.example/hook');
    expect(result.ok).toBe(false);
    expect(lookupMock).toHaveBeenCalled();
  });

  it('allows a hostname that resolves to a public IP', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    const { resolveWebhookUrl } = await import('../../src/lib/outboundUrl.js');
    const result = await resolveWebhookUrl('https://gotify.example.com');
    expect(result.ok).toBe(true);
  });
});
