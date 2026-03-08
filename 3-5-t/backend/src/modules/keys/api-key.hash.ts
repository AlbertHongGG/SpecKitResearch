import { createHmac, timingSafeEqual } from 'node:crypto';

export function hmacSha256Hex(key: string, value: string): string {
  return createHmac('sha256', key).update(value).digest('hex');
}

export function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
