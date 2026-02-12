import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/http/routeError';
import { assertSameOrigin } from '@/lib/server/security/sameOrigin';
import { prisma } from '@/lib/server/db';
import { ApiError } from '@/lib/shared/apiError';
import { registerSchema } from '@/lib/shared/schemas/auth';
import { hashPassword } from '@/lib/server/password';
import { DEFAULT_CATEGORIES } from '@/lib/server/seed/defaultCategories';
import { assertRateLimit } from '@/lib/server/security/rateLimit';
import { makeSessionSetCookie } from '@/lib/server/auth/session';
import { logEvent } from '@/lib/server/observability/logger';

function isPrismaUniqueConstraintError(err: unknown): err is { code: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
  );
}

export async function POST(req: NextRequest) {
  return handleRoute(req, async (requestId) => {
    assertSameOrigin(req);
    assertRateLimit(req, { key: 'auth:register', limit: 5, windowMs: 60_000 });

    const body = registerSchema.safeParse(await req.json());
    if (!body.success) {
      throw new ApiError({ status: 422, code: 'VALIDATION', message: '輸入驗證失敗' });
    }

    const { email, password } = body.data;

    try {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: await hashPassword(password),
          categories: {
            createMany: {
              data: DEFAULT_CATEGORIES.map((c) => ({
                name: c.name,
                type: c.type,
                isDefault: c.isDefault,
                isActive: true,
              })),
            },
          },
        },
        select: { id: true, email: true },
      });

      const res = NextResponse.json({ user }, { status: 201 });
      res.headers.set('set-cookie', await makeSessionSetCookie(user.id));

      logEvent({ requestId, userId: user.id, action: 'auth.register' });
      return res;
    } catch (err) {
      if (isPrismaUniqueConstraintError(err) && err.code === 'P2002') {
        throw new ApiError({ status: 409, code: 'EMAIL_TAKEN', message: 'Email 已被註冊' });
      }
      throw err;
    }
  });
}
