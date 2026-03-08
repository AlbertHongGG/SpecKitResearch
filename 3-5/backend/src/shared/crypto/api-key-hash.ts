import { createHmac, timingSafeEqual } from 'crypto';

import { getEnv } from '../config/env';

export function hashApiKeySecret(secret: string): string {
  const env = getEnv();
  return createHmac('sha256', env.API_KEY_HMAC_SECRET).update(secret, 'utf8').digest('hex');
}

export function constantTimeEqualHex(aHex: string, bHex: string): boolean {
  if (aHex.length !== bHex.length) return false;

  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
