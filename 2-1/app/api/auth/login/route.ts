import { prisma } from '@/db/prisma';
import { setSessionCookie } from '@/lib/auth/cookies';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/sessionStore';
import { generateSessionToken } from '@/lib/auth/sessionToken';
import { AppError } from '@/lib/errors/AppError';
import { created } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { loginBodySchema } from '@/lib/validators/auth';

export const POST = withErrorHandling(async (req) => {
  assertSameOrigin(req);

  const body = await parseJson(req, loginBodySchema);

  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user) {
    throw AppError.unauthorized('帳號或密碼錯誤');
  }
  if (!user.isActive) {
    throw AppError.unauthorized('帳號已停用');
  }
  if (!verifyPassword(body.password, user.passwordHash)) {
    throw AppError.unauthorized('帳號或密碼錯誤');
  }

  const token = generateSessionToken();
  const session = await createSession(user.id, token);
  await setSessionCookie(token, session.expiresAt);

  return created({
    sessionEstablished: true as const,
    user: {
      userId: user.id,
      email: user.email,
      role: user.role as 'student' | 'instructor' | 'admin',
      isActive: user.isActive,
    },
  });
});
