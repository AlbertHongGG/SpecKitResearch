import { NextResponse, type NextRequest } from 'next/server';

import { loginRequestSchema } from '../../../../src/shared/schema/auth';
import { prisma } from '../../../../src/server/db/prisma';
import { HttpError } from '../../../../src/server/errors/errors';
import { withRouteHandler } from '../../../../src/server/http/routeHandler';
import { verifyPassword } from '../../../../src/server/auth/password';
import { createSession, encodeSessionCookie, SESSION_COOKIE_NAME } from '../../../../src/server/session/session';

export const POST = withRouteHandler(async (req: NextRequest) => {
  const json = await req.json().catch(() => null);
  const parsed = loginRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new HttpError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '輸入格式錯誤',
      details: parsed.error.flatten(),
    });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new HttpError({ status: 401, code: 'AUTH_UNAUTHORIZED', message: 'Email 或密碼錯誤' });
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    throw new HttpError({ status: 401, code: 'AUTH_UNAUTHORIZED', message: 'Email 或密碼錯誤' });
  }

  const session = createSession({ userId: user.id, role: user.role });
  const cookieValue = encodeSessionCookie(session);

  const res = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role, isActive: user.isActive } });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
});
