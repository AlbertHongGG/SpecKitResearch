import crypto from 'crypto';

import { env } from '@/lib/env';

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  // Hash with secret so leaked DB doesn't allow cookie forgery.
  const secret = env().SESSION_SECRET;
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}
