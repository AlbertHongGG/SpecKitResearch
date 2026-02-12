import { prisma } from './prisma';
import type { SessionRecord, SessionRepo } from '../../domain/sessions/sessionRepo';

export const sessionRepoPrisma: SessionRepo = {
  async create(args): Promise<SessionRecord> {
    const expiresAt = new Date(Date.now() + args.ttlDays * 24 * 60 * 60 * 1000);

    return prisma.session.create({
      data: {
        userId: args.userId,
        expiresAt,
      },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        lastSeenAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
  },

  async findActiveById(sessionId: string): Promise<SessionRecord | null> {
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
        createdAt: true,
        lastSeenAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
  },

  async revoke(sessionId: string) {
    await prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
