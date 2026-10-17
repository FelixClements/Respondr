import { describe, expect, it } from 'vitest';
import { checkPushEndpoint } from '../../src/lib/pushValidation.js';

describe('checkPushEndpoint', () => {
  it('allows https endpoints on known push hosts', () => {
    expect(checkPushEndpoint('https://fcm.googleapis.com/fcm/send/abc').ok).toBe(true);
    expect(checkPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc').ok).toBe(
      true
    );
    expect(checkPushEndpoint('https://web.push.apple.com/abc').ok).toBe(true);
    expect(checkPushEndpoint('https://wns2-par02p.notify.windows.com/w/?token=1').ok).toBe(true);
  });

  it('rejects empty, http, unknown hosts, lookalikes, and metadata', () => {
    expect(checkPushEndpoint('  ').ok).toBe(false);
    expect(checkPushEndpoint('http://fcm.googleapis.com/fcm/send/abc').ok).toBe(false);
    expect(checkPushEndpoint('https://evil.example/push').ok).toBe(false);
    expect(checkPushEndpoint('https://evilfcm.googleapis.com.example/x').ok).toBe(false);
    expect(checkPushEndpoint('https://169.254.169.254/').ok).toBe(false);
  });
});
