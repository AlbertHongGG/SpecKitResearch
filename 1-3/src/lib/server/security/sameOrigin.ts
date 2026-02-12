import type { NextRequest } from 'next/server';
import { ApiError } from '@/lib/shared/apiError';

export function assertSameOrigin(req: NextRequest) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  const origin = req.headers.get('origin');
  if (!origin) {
    throw new ApiError({
      status: 403,
      code: 'CSRF_ORIGIN_MISSING',
      message: 'Forbidden',
    });
  }

  const host = req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  const expected = `${proto}://${host}`;

  if (origin !== expected) {
    throw new ApiError({
      status: 403,
      code: 'CSRF_ORIGIN_MISMATCH',
      message: 'Forbidden',
    });
  }
}
