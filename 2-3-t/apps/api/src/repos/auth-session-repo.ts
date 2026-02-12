import type { Prisma, PrismaClient } from '@prisma/client';

export type CreateAuthSessionInput = {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  rotatedFromSessionId?: string | null;
  userAgent?: string | null;
  ip?: string | null;
};

export async function createAuthSession(prisma: PrismaClient | Prisma.TransactionClient, input: CreateAuthSessionInput) {
  return prisma.authSession.create({
    data: {
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      expiresAt: input.expiresAt,
      rotatedFromSessionId: input.rotatedFromSessionId ?? null,
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
    },
  });
}

export async function findAuthSessionByHash(
  prisma: PrismaClient | Prisma.TransactionClient,
  refreshTokenHash: string
) {
  return prisma.authSession.findFirst({
    where: {
      refreshTokenHash,
    },
  });
}

export async function revokeAuthSession(
  prisma: PrismaClient | Prisma.TransactionClient,
  sessionId: string,
  revokedAt: Date = new Date()
) {
  return prisma.authSession.update({
    where: { id: sessionId },
    data: { revokedAt },
  });
}

export async function revokeAllUserSessions(
  prisma: PrismaClient | Prisma.TransactionClient,
  userId: string,
  revokedAt: Date = new Date()
) {
  return prisma.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt },
  });
}

export async function isSessionActive(session: { revokedAt: Date | null; expiresAt: Date }): Promise<boolean> {
  return session.revokedAt === null && session.expiresAt.getTime() > Date.now();
}
