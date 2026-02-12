import type { NextRequest } from 'next/server';
import { ApiError } from '@/lib/shared/apiError';
import { getUserIdFromRequest } from '@/lib/server/auth/session';

export async function requireUserId(req: NextRequest): Promise<string> {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: '請先登入' });
  }
  return userId;
}
