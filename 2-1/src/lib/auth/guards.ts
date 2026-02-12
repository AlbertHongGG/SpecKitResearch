import { AppError } from '@/lib/errors/AppError';
import { currentUser } from '@/lib/auth/currentUser';
import type { Role } from '@/lib/types';

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw AppError.unauthorized();
  return user;
}

export async function requireRole(allowed: Role[]) {
  const user = await requireUser();
  if (!allowed.includes(user.role)) {
    throw AppError.forbidden();
  }
  return user;
}
