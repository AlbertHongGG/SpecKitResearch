import type { CookieOptions } from 'express';

function isSecure(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  const origin = process.env.APP_ORIGIN;
  if (!origin) return false;
  try {
    return new URL(origin).protocol === 'https:';
  } catch {
    return false;
  }
}

export function sessionCookieName(): string {
  // __Host- cookies are required to be Secure; over plain HTTP browsers will drop them.
  return isSecure() ? '__Host-session' : 'session';
}

export function sessionCookieOptions(expiresAt?: Date): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(),
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export function csrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    sameSite: 'lax',
    secure: isSecure(),
    path: '/',
  };
}
