import { Controller, Get, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { PrismaService } from '../../common/db/prisma.service';
import { getConfig } from '../../common/config/config';

@Controller()
export class SessionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/session')
  async session(@Req() req: FastifyRequest) {
    const config = getConfig(process.env);
    const sid = (req as any).cookies?.[config.sessionCookieName];
    if (!sid) return { authenticated: false };

    const session = await this.prisma.session.findUnique({ where: { id: sid }, include: { user: true } });
    if (!session || session.revokedAt) return { authenticated: false };
    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) return { authenticated: false };
    if (session.user.status !== 'ACTIVE') return { authenticated: false };

    return {
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role === 'ADMIN' ? 'admin' : 'developer',
        status: session.user.status === 'ACTIVE' ? 'active' : 'disabled',
      },
    };
  }
}
