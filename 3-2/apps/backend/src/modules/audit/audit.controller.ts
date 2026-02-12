import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { throwNotFound } from '../../common/rbac/existence-strategy.js';

@Controller('audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(SessionGuard)
  async list(
    @Query('orgId') orgId: string | undefined,
    @Query('projectId') projectId: string | undefined,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    if (orgId) {
      const m = await this.prisma.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId: user!.id } },
      });
      if (!m) throwNotFound();
    }

    const logs = await this.prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        projectId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        action: true,
        entityType: true,
        entityId: true,
        actorEmail: true,
        organizationId: true,
        projectId: true,
      },
    });

    return { auditLogs: logs };
  }
}
