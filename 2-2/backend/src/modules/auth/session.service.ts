import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string, ttlSeconds: number) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    return this.prisma.session.create({
      data: {
        userId,
        expiresAt,
      },
    });
  }

  async revokeSession(sessionId: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async getValidSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!session) {
      return null;
    }
    if (session.revokedAt) {
      return null;
    }
    if (session.expiresAt <= new Date()) {
      return null;
    }
    if (!session.user.isActive) {
      return null;
    }
    return session;
  }
}
