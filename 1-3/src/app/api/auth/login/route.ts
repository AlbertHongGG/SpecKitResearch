import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/http/routeError';
import { assertSameOrigin } from '@/lib/server/security/sameOrigin';
import { assertRateLimit } from '@/lib/server/security/rateLimit';
import { prisma } from '@/lib/server/db';
import { ApiError } from '@/lib/shared/apiError';
import { loginSchema } from '@/lib/shared/schemas/auth';
import { verifyPassword } from '@/lib/server/password';
import { makeSessionSetCookie } from '@/lib/server/auth/session';
import { logEvent } from '@/lib/server/observability/logger';

export async function POST(req: NextRequest) {
  return handleRoute(req, async (requestId) => {
    assertSameOrigin(req);
    assertRateLimit(req, { key: 'auth:login', limit: 10, windowMs: 60_000 });

    const body = loginSchema.safeParse(await req.json());
    if (!body.success) {
      throw new ApiError({ status: 422, code: 'VALIDATION', message: '輸入驗證失敗' });
    }

    const { email, password } = body.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new ApiError({ status: 401, code: 'INVALID_CREDENTIALS', message: '帳密錯誤' });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new ApiError({ status: 401, code: 'INVALID_CREDENTIALS', message: '帳密錯誤' });

    const res = NextResponse.json({ signedIn: true }, { status: 200 });
    res.headers.set('set-cookie', await makeSessionSetCookie(user.id));

    logEvent({ requestId, userId: user.id, action: 'auth.login' });
    return res;
  });
}
