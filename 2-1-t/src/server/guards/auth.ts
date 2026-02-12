import type { NextRequest } from 'next/server';

import type { Role } from '../../domain/rbac';
import { HttpError } from '../errors/errors';
import { getCurrentUser } from '../session/getCurrentUser';

export async function optionalAuth(req: NextRequest) {
  const user = await getCurrentUser(req);
  return user;
}

export async function requireAuth(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new HttpError({
      status: 401,
      code: 'AUTH_UNAUTHORIZED',
      message: '需要登入',
    });
  }
  return user;
}

export async function requireRole(req: NextRequest, roles: Role[]) {
  const user = await requireAuth(req);
  if (!roles.includes(user.role)) {
    throw new HttpError({
      status: 403,
      code: 'AUTH_FORBIDDEN',
      message: '權限不足',
      details: { required: roles, actual: user.role },
    });
  }
  return user;
}
