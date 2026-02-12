import type { CookieOptions } from 'express';

export function sessionCookieOptions(): CookieOptions {
  const secure = String(process.env.COOKIE_SECURE ?? 'false') === 'true';
  const sameSiteRaw = String(process.env.COOKIE_SAMESITE ?? 'lax').toLowerCase();
  const sameSite = (['lax', 'strict', 'none'] as const).includes(sameSiteRaw as any)
    ? (sameSiteRaw as 'lax' | 'strict' | 'none')
    : 'lax';

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
}
