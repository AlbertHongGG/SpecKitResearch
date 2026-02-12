import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ApiError, toApiErrorResponse } from '@/lib/shared/apiError';
import { getOrCreateRequestId, REQUEST_ID_HEADER } from '@/lib/server/observability/requestId';
import { logError, logWarn } from '@/lib/server/observability/logger';
import { getUserIdFromRequest } from '@/lib/server/auth/session';

function applyCommonHeaders(res: NextResponse, requestId: string) {
  res.headers.set(REQUEST_ID_HEADER, requestId);
  if (!res.headers.has('cache-control')) {
    res.headers.set('cache-control', 'no-store');
  }
}

export async function handleRoute(
  req: NextRequest,
  fn: (requestId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = getOrCreateRequestId(req);
  const userId = await getUserIdFromRequest(req).catch(() => null);

  try {
    const res = await fn(requestId);
    applyCommonHeaders(res, requestId);
    return res;
  } catch (err) {
    if (err instanceof ApiError) {
      const apiErr =
        err.status === 403 && !err.code
          ? new ApiError({ status: 403, code: 'FORBIDDEN', message: err.message })
          : err;

      if (apiErr.status === 403) {
        const { pathname } = new URL(req.url);
        logWarn(`Forbidden: ${apiErr.code} ${req.method.toUpperCase()} ${pathname}`, { requestId, userId: userId ?? undefined });
      }

      const res = NextResponse.json(toApiErrorResponse(apiErr), { status: apiErr.status });
      applyCommonHeaders(res, requestId);
      return res;
    }

    logError('Unhandled API error', err, { requestId, userId: userId ?? undefined });
    const unknown = new ApiError({ status: 500, code: 'INTERNAL', message: '系統錯誤，請稍後再試' });
    const res = NextResponse.json(toApiErrorResponse(unknown), { status: 500 });
    applyCommonHeaders(res, requestId);
    return res;
  }
}
