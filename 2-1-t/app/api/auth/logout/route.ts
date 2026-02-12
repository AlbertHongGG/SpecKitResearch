import { NextResponse } from 'next/server';

import { withRouteHandler } from '../../../../src/server/http/routeHandler';
import { SESSION_COOKIE_NAME } from '../../../../src/server/session/session';

export const POST = withRouteHandler(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
  return res;
});
