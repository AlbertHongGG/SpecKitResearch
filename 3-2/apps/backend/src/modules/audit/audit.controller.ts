import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { throwNotFound } from '../../common/rbac/existence-strategy.js';
import { isPlatformAdmin } from '../../common/rbac/roles.js';

@Controller('audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeLimit(limit: unknown) {
    const n = typeof limit === 'string' ? Number(limit) : typeof limit === 'number' ? limit : 50;
    if (!Number.isFinite(n) || n <= 0) return 50;
    return Math.min(50, Math.floor(n));
  }

  @Get()
  @UseGuards(SessionGuard)
  async list(
    @Query('orgId') orgId: string | undefined,
    @Query('projectId') projectId: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const platformAdmin = isPlatformAdmin(user?.platformRole);

    if (!orgId && !projectId && !platformAdmin) {
      // Prevent global audit access for non-platform users.
      throwNotFound();
    }

    if (orgId) {
      if (!platformAdmin) {
        const m = await this.prisma.organizationMembership.findUnique({
          where: { organizationId_userId: { organizationId: orgId, userId: user!.id } },
        });
        if (!m) throwNotFound();
      }
    }

    if (projectId) {
      if (!platformAdmin) {
        const m = await this.prisma.projectMembership.findUnique({
          where: { projectId_userId: { projectId, userId: user!.id } },
        });
        if (!m) throwNotFound();
      }
    }

    const take = this.normalizeLimit(limit);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        organizationId: orgId,
        projectId,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        createdAt: true,
        action: true,
        entityType: true,
        entityId: true,
        actorEmail: true,
        beforeJson: true,
        afterJson: true,
      },
    });

    const nextCursor = logs.length > take ? logs[logs.length - 1]!.id : null;
    const page = logs.slice(0, take);

    return {
      events: page.map((l) => ({
        actorEmail: l.actorEmail,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        before: l.beforeJson ? JSON.parse(l.beforeJson) : null,
        after: l.afterJson ? JSON.parse(l.afterJson) : null,
        createdAt: l.createdAt.toISOString(),
      })),
      nextCursor,
    };
  }
}
