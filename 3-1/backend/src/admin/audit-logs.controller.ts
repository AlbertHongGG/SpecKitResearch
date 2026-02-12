import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../shared/db/prisma.service';

@Controller('admin/audit-logs')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('actorUserId') actorUserId?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
  ) {
    const where: any = {};
    if (actorUserId) where.actorUserId = actorUserId;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (since || until) {
      where.createdAt = {};
      if (since) where.createdAt.gte = new Date(since);
      if (until) where.createdAt.lte = new Date(until);
    }

    const items = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return { items };
  }
}
