import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionStore {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(params: {
    token: string;
    userId: string;
    expiresAt: Date;
  }) {
    return this.prisma.session.create({
      data: {
        token: params.token,
        userId: params.userId,
        expiresAt: params.expiresAt,
      },
    });
  }

  async findValidSessionByToken(token: string, now: Date) {
    return this.prisma.session.findFirst({
      where: {
        token,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        user: {
          include: {
            roleAssignments: true,
          },
        },
      },
    });
  }

  async deleteByToken(token: string) {
    await this.prisma.session.deleteMany({
      where: {
        token,
      },
    });
  }
}
