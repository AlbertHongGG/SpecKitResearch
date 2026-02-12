import { prisma } from '@/db/prisma';
import { hashSessionToken } from '@/lib/auth/sessionToken';

const DEFAULT_TTL_DAYS = 14;

export type SessionRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export async function createSession(userId: string, token: string, ttlDays = DEFAULT_TTL_DAYS) {
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      lastSeenAt: new Date(),
    },
    select: { id: true, userId: true, expiresAt: true, revokedAt: true },
  });

  return session;
}

export async function findValidSession(token: string) {
  const tokenHash = hashSessionToken(token);
  const now = new Date();

  return prisma.session.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    include: { user: true },
  });
}

export async function touchSession(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastSeenAt: new Date() },
  });
}

export async function revokeSessionByToken(token: string) {
  const tokenHash = hashSessionToken(token);
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessionsForUser(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
