import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../shared/db/prisma.service';
import { RequireSessionGuard } from '../../guards/require-session.guard';
import type { FastifyRequest } from 'fastify';

import type { SessionPrincipal } from '../../shared/auth/auth.types';

type RequestWithSession = FastifyRequest & { session?: SessionPrincipal };

@Controller()
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @UseGuards(RequireSessionGuard)
  async me(@Req() request: RequestWithSession) {
    const userId = request.session!.userId;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    return {
      user_id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.createdAt.toISOString()
    };
  }
}
