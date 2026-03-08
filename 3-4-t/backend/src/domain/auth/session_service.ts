import type { PrismaClient } from '@prisma/client';

export class SessionService {
  private prisma: PrismaClient;
  private ttlSec: number;

  constructor(params: { prisma: PrismaClient; ttlSec: number }) {
    this.prisma = params.prisma;
    this.ttlSec = params.ttlSec;
  }

  async createSession(params: { userId: string; meta?: any }) {
    const sid = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlSec * 1000);

    const session = await this.prisma.session.create({
      data: {
        sid,
        user_id: params.userId,
        expires_at: expiresAt,
        meta: params.meta ?? null,
      },
    });

    return session;
  }

  async revokeSession(sid: string) {
    await this.prisma.session.update({
      where: { sid },
      data: { revoked_at: new Date() },
    });
  }

  async rotateSession(sid: string) {
    const existing = await this.prisma.session.findUnique({ where: { sid } });
    if (!existing) return null;
    await this.revokeSession(sid);
    return this.createSession({ userId: existing.user_id, meta: existing.meta });
  }

  async validateSession(sid: string) {
    const session = await this.prisma.session.findUnique({
      where: { sid },
      include: { user: true },
    });
    if (!session) return null;
    if (session.revoked_at) return null;
    if (session.expires_at.getTime() <= Date.now()) return null;

    await this.prisma.session.update({
      where: { sid },
      data: { last_seen_at: new Date() },
    });

    return { session, user: session.user };
  }
}
