import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string) {
    const id = randomUUID();
    const csrfToken = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await this.prisma.session.create({
      data: {
        id,
        userId,
        csrfToken,
        expiresAt,
      },
    });

    return { id, csrfToken, expiresAt };
  }

  async deleteSession(sessionId: string) {
    await this.prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
  }
}
