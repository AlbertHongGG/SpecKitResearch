import { SignJWT, jwtVerify } from 'jose';
import { serialize } from 'cookie';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { env } from '@/lib/server/env';

const ISSUER = 'expense-tracker';
const AUDIENCE = 'expense-tracker-web';

function getKey() {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export async function createSessionToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 24 * 14) // 14 days
    .sign(getKey());
}

export async function makeSessionSetCookie(userId: string): Promise<string> {
  const token = await createSessionToken(userId);
  return serialize(env.AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function makeSessionClearCookie(): string {
  return serialize(env.AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    const sub = payload.sub;
    if (typeof sub !== 'string' || !sub) return null;
    return sub;
  } catch {
    return null;
  }
}

export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(env.AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getUserIdFromServerCookies(): Promise<string | null> {
  const token = cookies().get(env.AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
