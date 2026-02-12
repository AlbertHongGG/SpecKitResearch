import { prisma } from '@/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { setSessionCookie } from '@/lib/auth/cookies';
import { createSession } from '@/lib/auth/sessionStore';
import { generateSessionToken } from '@/lib/auth/sessionToken';
import { AppError } from '@/lib/errors/AppError';
import { created } from '@/lib/http/apiResponse';
import { withErrorHandling } from '@/lib/http/withErrorHandling';
import { parseJson } from '@/lib/http/validate';
import { assertSameOrigin } from '@/lib/security/sameOrigin';
import { registerBodySchema } from '@/lib/validators/auth';

export const POST = withErrorHandling(async (req) => {
  assertSameOrigin(req);

  const body = await parseJson(req, registerBodySchema);
  const passwordHash = hashPassword(body.password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        role: 'student',
        isActive: true,
      },
    });
  } catch (e: unknown) {
    const code = typeof e === 'object' && e && 'code' in e ? (e as any).code : undefined;
    if (code === 'P2002') {
      throw AppError.conflict('Email 已被使用');
    }
    throw e;
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
