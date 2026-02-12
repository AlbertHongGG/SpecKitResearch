import type { Response } from 'express';

export const SESSION_COOKIE_NAME = 'session';

export type SessionCookieOptions = {
  secure: boolean;
};

export function setSessionCookie(res: Response, sessionId: string, opts: SessionCookieOptions) {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: opts.secure,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}
