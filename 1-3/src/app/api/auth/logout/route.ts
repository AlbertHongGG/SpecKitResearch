import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/http/routeError';
import { assertSameOrigin } from '@/lib/server/security/sameOrigin';
import { assertRateLimit } from '@/lib/server/security/rateLimit';
import { makeSessionClearCookie } from '@/lib/server/auth/session';
import { getUserIdFromRequest } from '@/lib/server/auth/session';
import { logEvent } from '@/lib/server/observability/logger';

export async function POST(req: NextRequest) {
  return handleRoute(req, async (requestId) => {
    assertSameOrigin(req);
    assertRateLimit(req, { key: 'auth:logout', limit: 30, windowMs: 60_000 });

    const userId = await getUserIdFromRequest(req).catch(() => null);
    const res = NextResponse.json({ signedIn: false }, { status: 200 });
    res.headers.set('set-cookie', makeSessionClearCookie());

    if (userId) {
      logEvent({ requestId, userId, action: 'auth.logout' });
    }
    return res;
  });
}
