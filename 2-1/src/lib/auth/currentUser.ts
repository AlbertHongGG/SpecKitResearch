import { getSessionCookie } from '@/lib/auth/cookies';
import { findValidSession, touchSession } from '@/lib/auth/sessionStore';
import { AppError } from '@/lib/errors/AppError';

export type CurrentUser = {
  id: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  isActive: boolean;
};

export async function currentUser(): Promise<CurrentUser | null> {
  const token = await getSessionCookie();
  if (!token) return null;

  const session = await findValidSession(token);
  if (!session) return null;

  const user = session.user;
  if (!user.isActive) {
    return null;
  }

  // fire and forget-ish; but await to keep it simple.
  await touchSession(session.id);

  return {
    id: user.id,
    email: user.email,
    role: user.role as CurrentUser['role'],
    isActive: user.isActive,
  };
}

export async function currentUserOrThrow() {
  const user = await currentUser();
  if (!user) {
    throw AppError.unauthorized();
  }
  return user;
}
