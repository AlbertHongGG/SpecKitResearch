import type { User } from '@prisma/client';
import { cookies } from 'next/headers';

import type { Role } from '../../domain/rbac';
import { prisma } from '../db/prisma';
import { decodeSessionCookie, SESSION_COOKIE_NAME, type SessionInfo } from './session';

export async function getServerSession(): Promise<SessionInfo | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return decodeSessionCookie(raw);
  } catch {
    return null;
  }
}

export type ServerCurrentUser = Pick<User, 'id' | 'email' | 'role' | 'isActive'> & { role: Role };

export async function getServerCurrentUser(): Promise<ServerCurrentUser | null> {
  const session = await getServerSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!user) return null;
  if (!user.isActive) return null;

  return {
    ...user,
    role: user.role as Role,
  };
}
