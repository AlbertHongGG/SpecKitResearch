import { createHmac, timingSafeEqual } from 'node:crypto';

import type { Role } from '../../domain/rbac';
import { getEnv } from '../config/env';

export const SESSION_COOKIE_NAME = 'session';

export type SessionInfo = {
  userId: string;
  role: Role;
  issuedAt: string; // ISO
  expiresAt: string; // ISO
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function base64UrlDecode(input: string): string {
  const padLen = (4 - (input.length % 4)) % 4;
  const padded = input + '='.repeat(padLen);
  const b64 = padded.replaceAll('-', '+').replaceAll('_', '/');
  return Buffer.from(b64, 'base64').toString('utf-8');
}

function sign(payloadB64: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(payloadB64).digest();
  return sig
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export function createSession(params: { userId: string; role: Role; now?: Date }): SessionInfo {
  const env = getEnv();
  const now = params.now ?? new Date();
  const expiresAt = new Date(now.getTime() + env.SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  return {
    userId: params.userId,
    role: params.role,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export function encodeSessionCookie(session: SessionInfo): string {
  const env = getEnv();
  const payloadB64 = base64UrlEncode(JSON.stringify(session));
  const sig = sign(payloadB64, env.SESSION_SECRET);
  return `${payloadB64}.${sig}`;
}

export function decodeSessionCookie(cookieValue: string): SessionInfo | null {
  const env = getEnv();
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sig] = parts;
  const expectedSig = sign(payloadB64, env.SESSION_SECRET);

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const session = JSON.parse(base64UrlDecode(payloadB64)) as SessionInfo;
    if (!session.userId || !session.role || !session.issuedAt || !session.expiresAt) return null;

    if (new Date(session.expiresAt).getTime() <= Date.now()) return null;

    return session;
  } catch {
    return null;
  }
}
