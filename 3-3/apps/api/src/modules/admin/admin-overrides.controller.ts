import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { getContext } from '../../common/request-context';
import { AuthGuard } from '../../guards/auth.guard';
import { PlatformAdminGuard } from '../../guards/platform-admin.guard';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../db/prisma.service';

const forceSchema = z.object({
  organizationId: z.string().min(1),
  forcedStatus: z.enum(['NONE', 'Suspended', 'Expired']),
  reason: z.string().min(1),
});

@Controller('admin/overrides')
@UseGuards(AuthGuard, PlatformAdminGuard)
export class AdminOverridesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  async force(@Req() req: Request, @Body() body: unknown) {
    const ctx = getContext(req);
    const parsed = forceSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const org = await this.prisma.organization.findUnique({ where: { id: parsed.data.organizationId } });
    if (!org) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Organization not found' });
    }

    const expiredEver = await this.prisma.adminOverride.findFirst({
      where: { organizationId: parsed.data.organizationId, forcedStatus: 'Expired' },
      select: { id: true },
    });
    if (expiredEver && parsed.data.forcedStatus !== 'Expired') {
      throw new AppError({ errorCode: 'CONFLICT', status: 409, message: 'Expired override is irreversible' });
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const active = await tx.adminOverride.findFirst({
        where: { organizationId: parsed.data.organizationId, revokedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      if (parsed.data.forcedStatus === 'NONE') {
        if (active) {
          const revoked = await tx.adminOverride.update({
            where: { id: active.id },
            data: { revokedAt: now },
          });
          return revoked;
        }

        // no-op revoke
        return {
          id: 'none',
          organizationId: parsed.data.organizationId,
          forcedStatus: 'NONE' as const,
          reason: parsed.data.reason,
          createdByUserId: ctx.user!.id,
          createdAt: now,
          revokedAt: now,
        };
      }

      const created = await tx.adminOverride.create({
        data: {
          organizationId: parsed.data.organizationId,
          forcedStatus: parsed.data.forcedStatus,
          reason: parsed.data.reason,
          createdByUserId: ctx.user!.id,
        },
      });

      return created;
    });

    await this.audit.writeAuditLog({
      actorUserId: ctx.user!.id,
      actorRoleContext: 'PLATFORM_ADMIN',
      organizationId: parsed.data.organizationId,
      action: 'admin.overrides.force',
      targetType: 'AdminOverride',
      targetId: result.id,
      payload: parsed.data,
    });

    return {
      forcedStatus: result.forcedStatus,
      createdAt: result.createdAt.toISOString(),
      revokedAt: result.revokedAt ? result.revokedAt.toISOString() : null,
    };
  }
}
