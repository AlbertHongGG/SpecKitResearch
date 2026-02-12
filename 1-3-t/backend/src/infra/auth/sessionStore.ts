import { prisma } from '../db/prisma';

const DEFAULT_TTL_DAYS = 30;

export type SessionRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export async function createSession(args: { userId: string; ttlDays?: number }) {
  const ttlDays = args.ttlDays ?? DEFAULT_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId: args.userId,
      expiresAt,
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  return session satisfies SessionRecord;
}

export async function getActiveSessionById(sessionId: string) {
  const now = new Date();
  return prisma.session.findFirst({
    where: {
      id: sessionId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
    },
  });
}

export async function revokeSession(sessionId: string) {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
