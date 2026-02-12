import type { User } from '@prisma/client';
import type { NextRequest } from 'next/server';

import type { Role } from '../../domain/rbac';
import { prisma } from '../db/prisma';
import { decodeSessionCookie, SESSION_COOKIE_NAME, type SessionInfo } from './session';

export async function getSession(req: NextRequest): Promise<SessionInfo | null> {
  const raw = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  return decodeSessionCookie(raw);
}

export type CurrentUser = Pick<User, 'id' | 'email' | 'role' | 'isActive'> & { role: Role };

export async function getCurrentUser(req: NextRequest): Promise<CurrentUser | null> {
  const session = await getSession(req);
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
