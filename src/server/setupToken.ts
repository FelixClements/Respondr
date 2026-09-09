import crypto from 'node:crypto';
import { getSetupToken } from './secrets.js';

export function verifySetupToken(
  headerToken: string | undefined,
  bodyToken: string | undefined
): boolean {
  const expected = getSetupToken();
  if (!expected) return true;
  const provided = (headerToken || bodyToken || '').trim();
  if (!provided) return false;

  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}
