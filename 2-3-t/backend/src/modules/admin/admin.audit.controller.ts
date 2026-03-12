import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../common/db/prisma.service';
import { RbacGuard, RequireRole, RequireSession } from '../../common/security/rbac.guard';

@Controller('/admin/audit')
@UseGuards(RbacGuard)
@RequireSession()
@RequireRole('ADMIN')
export class AdminAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('action') action?: string,
    @Query('limit') limitRaw?: string,
    @Query('cursor') cursorRaw?: string,
  ) {
    const limit = Math.min(Math.max(Number(limitRaw ?? 50) || 50, 1), 200);
    const cursor = cursorRaw ? String(cursorRaw) : undefined;
    const where: any = {};
    if (from) where.createdAt = { ...(where.createdAt ?? {}), gte: new Date(from) };
    if (to) where.createdAt = { ...(where.createdAt ?? {}), lte: new Date(to) };
    if (action) where.action = action;

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const nextCursor = rows.length === limit ? rows[rows.length - 1]?.id : null;

    return {
      items: rows.map((r) => ({
        occurred_at: r.createdAt.toISOString(),
        request_id: r.requestId ?? null,
        actor_user_id: r.actorUserId ?? null,
        action: r.action,
        target_type: r.targetType ?? null,
        target_id: r.targetId ?? null,
        metadata: (r.metadata as any) ?? null,
      })),
      next_cursor: nextCursor,
    };
  }
}
