import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { RequireAdminGuard } from '../../guards/require-admin.guard';
import { PrismaService } from '../../shared/db/prisma.service';

import { AuditLogsQueryDto } from './audit-logs.dto';

@Controller('audit-logs')
@UseGuards(RequireAdminGuard)
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: AuditLogsQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const rows = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        ...(query.actor_role ? { actorRole: query.actor_role as any } : {}),
        ...(query.actor_user_id ? { actorUserId: query.actor_user_id } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.target_type ? { targetType: query.target_type } : {}),
        ...(query.target_id ? { targetId: query.target_id } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    return rows.map((r) => ({
      audit_log_id: r.id,
      actor_user_id: r.actorUserId ?? null,
      actor_role: r.actorRole,
      action: r.action,
      target_type: r.targetType,
      target_id: r.targetId ?? null,
      metadata: r.metadataJson ? safeJsonParse(r.metadataJson) : null,
      created_at: r.createdAt.toISOString()
    }));
  }
}

function safeJsonParse(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
