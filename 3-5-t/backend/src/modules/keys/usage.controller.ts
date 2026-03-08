import { Controller, Get, ForbiddenException, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../common/db/prisma.service';
import { CurrentAuth, RbacGuard, RequireSession } from '../../common/security/rbac.guard';

@Controller()
@UseGuards(RbacGuard)
export class UsageController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/keys/:id/usage')
  @RequireSession()
  async usage(
    @CurrentAuth() auth: any,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status_code') statusCode?: string,
    @Query('endpoint') endpointId?: string,
    @Query('limit') limitRaw?: string,
    @Query('cursor') cursorRaw?: string,
  ) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('Key not found');
    if (key.userId !== auth.user.id) throw new ForbiddenException('Forbidden');

    const limit = Math.min(Math.max(Number(limitRaw ?? 50) || 50, 1), 200);
    const cursor = cursorRaw ? String(cursorRaw) : undefined;

    const where: any = { keyId: id };
    if (from) where.createdAt = { ...(where.createdAt ?? {}), gte: new Date(from) };
    if (to) where.createdAt = { ...(where.createdAt ?? {}), lte: new Date(to) };
    if (statusCode) where.statusCode = Number(statusCode);
    if (endpointId) where.endpointId = endpointId;

    const rows = await this.prisma.usageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const nextCursor = rows.length === limit ? rows[rows.length - 1]?.id : null;

    return {
      items: rows.map((r) => ({
        id: r.id,
        created_at: r.createdAt.toISOString(),
        request_id: r.requestId ?? null,
        endpoint_id: r.endpointId ?? null,
        service_slug: null,
        method: r.method,
        path: r.path,
        status_code: r.statusCode,
        response_time_ms: r.durationMs ?? 0,
        error_code: r.errorCode ?? null,
      })),
      next_cursor: nextCursor,
    };
  }
}
