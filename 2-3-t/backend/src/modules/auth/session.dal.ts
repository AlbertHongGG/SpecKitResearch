import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/db/prisma.service';
import { getConfig } from '../../common/config/config';

@Injectable()
export class SessionDal {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string) {
    const config = getConfig(process.env);
    const id = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000);
    const session = await this.prisma.session.create({
      data: { id, userId, expiresAt },
    });
    return session;
  }

  async revokeSession(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }
}
