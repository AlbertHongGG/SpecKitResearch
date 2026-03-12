import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequireAdminGuard } from '../../guards/require-admin.guard';
import type { SessionPrincipal } from '../../shared/auth/auth.types';
import { PrismaService } from '../../shared/db/prisma.service';

import { UserDisableService } from './user-disable.service';

type RequestWithSession = FastifyRequest & { session?: SessionPrincipal };

@Controller('admin/users')
@UseGuards(RequireAdminGuard)
export class UsersAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disableService: UserDisableService,
  ) {}

  @Get()
  async list(@Query('q') q?: string) {
    const where = q
      ? {
          email: {
            contains: q.toLowerCase()
          }
        }
      : {};

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true }
    });

    return users.map((u) => ({
      user_id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      created_at: u.createdAt.toISOString(),
      last_login_at: u.lastLoginAt ? u.lastLoginAt.toISOString() : null
    }));
  }

  @Post(':userId/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disable(@Param('userId') userId: string, @Req() req: RequestWithSession): Promise<void> {
    await this.disableService.disableUser(req.session!, userId);
  }
}
