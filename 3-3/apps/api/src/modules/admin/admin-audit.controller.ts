import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { getContext } from '../../common/request-context';
import { AuthGuard } from '../../guards/auth.guard';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../db/prisma.service';

const querySchema = z.object({
  actorUserId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().min(1).optional(),
});

type Cursor = { createdAt: string; id: string };

function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): Cursor {
  const txt = Buffer.from(raw, 'base64url').toString('utf8');
  const parsed = JSON.parse(txt) as Cursor;
  if (!parsed?.createdAt || !parsed?.id) throw new Error('Invalid cursor');
  return parsed;
}

@Controller('admin/audit')
@UseGuards(AuthGuard, PlatformAdminGuard)
export class AdminAuditController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Req() req: Request, @Query() query: unknown) {
    // Access itself is security sensitive; force ctx resolution.
    const ctx = getContext(req);
    if (!ctx.user) {
      throw new AppError({ errorCode: 'AUTH_REQUIRED', status: 401, message: 'Authentication required' });
    }

    const parsed = querySchema.safeParse(query);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const limit = parsed.data.limit ?? 25;
    const cursor = parsed.data.cursor ? decodeCursor(parsed.data.cursor) : null;

    const rows = await this.prisma.auditLog.findMany({
      where: {
        ...(parsed.data.actorUserId ? { actorUserId: parsed.data.actorUserId } : {}),
        ...(parsed.data.organizationId ? { organizationId: parsed.data.organizationId } : {}),
        ...(parsed.data.action ? { action: parsed.data.action } : {}),
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? encodeCursor({ createdAt: items[items.length - 1].createdAt.toISOString(), id: items[items.length - 1].id }) : null;

    await this.audit.writeAuditLog({
      actorUserId: ctx.user!.id,
      actorRoleContext: 'PLATFORM_ADMIN',
      organizationId: parsed.data.organizationId ?? null,
      action: 'admin.audit.query',
      targetType: 'AuditLog',
      targetId: null,
      payload: {
        filters: {
          actorUserId: parsed.data.actorUserId ?? null,
          organizationId: parsed.data.organizationId ?? null,
          action: parsed.data.action ?? null,
        },
        limit,
        cursor: parsed.data.cursor ?? null,
        returnedCount: items.length,
        hasMore,
      },
    });

    return {
      auditLogs: items.map((r) => ({
        id: r.id,
        actorUserId: r.actorUserId ?? '',
        roleContext: r.actorRoleContext,
        organizationId: r.organizationId,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        payload: (r.payload as any) ?? {},
        createdAt: r.createdAt.toISOString(),
      })),
      nextCursor,
    };
  }
}
