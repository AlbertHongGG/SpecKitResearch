import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { ApiKeyStatus } from '@prisma/client';

import { RequireAdminGuard } from '../../guards/require-admin.guard';
import type { SessionPrincipal } from '../../shared/auth/auth.types';
import { PrismaService } from '../../shared/db/prisma.service';
import { AuditActions } from '../../shared/logging/audit-actions';
import { auditActorFromSession, writeAuditOrThrow } from '../../shared/logging/audit.decorators';
import { AuditLogService } from '../../shared/logging/audit-log.service';

type RequestWithSession = FastifyRequest & { session?: SessionPrincipal };

type ListAdminApiKeysQuery = {
  q?: string;
  user_id?: string;
  status?: string;
};

@Controller('admin/api-keys')
@UseGuards(RequireAdminGuard)
export class AdminApiKeysController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  @Get()
  async list(@Query() query: ListAdminApiKeysQuery) {
    const q = query.q?.trim();
    const userId = query.user_id?.trim();
    const status = query.status?.trim();

    const allowedStatuses = new Set<string>(['active', 'revoked', 'blocked']);
    if (status && !allowedStatuses.has(status)) {
      throw new BadRequestException({ error: { code: 'bad_request', message: 'Invalid status filter' } });
    }

    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { id: { contains: q } },
        { publicId: { contains: q } },
        { name: { contains: q } },
        { user: { email: { contains: q } } },
      ];
    }

    const rows = await this.prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        userId: true,
        name: true,
        status: true,
        expiresAt: true,
        rateLimitPerMinute: true,
        rateLimitPerHour: true,
        createdAt: true,
        revokedAt: true,
        lastUsedAt: true,
        replacedByKeyId: true,
        scopes: { select: { scope: { select: { name: true } } } },
      },
    });

    return rows.map((r) => ({
      api_key_id: r.id,
      user_id: r.userId,
      name: r.name,
      status: r.status,
      scopes: r.scopes.map((s) => s.scope.name),
      expires_at: r.expiresAt ? r.expiresAt.toISOString() : null,
      rate_limit_per_minute: r.rateLimitPerMinute,
      rate_limit_per_hour: r.rateLimitPerHour,
      created_at: r.createdAt.toISOString(),
      revoked_at: r.revokedAt ? r.revokedAt.toISOString() : null,
      last_used_at: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
      replaced_by_key_id: r.replacedByKeyId,
    }));
  }

  @Post(':apiKeyId/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Param('apiKeyId') apiKeyId: string, @Req() req: RequestWithSession): Promise<void> {
    const existing = await this.prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException({ error: { code: 'not_found', message: 'API key not found' } });
    }
    if (existing.status === ApiKeyStatus.revoked) return;

    const actor = auditActorFromSession(req.session!);
    await this.prisma.$transaction(async (tx) => {
      await tx.apiKey.update({
        where: { id: apiKeyId },
        data: { status: ApiKeyStatus.revoked, revokedAt: new Date() },
      });
      await writeAuditOrThrow({
        audit: this.audit,
        tx,
        actor,
        action: AuditActions.ApiKeyRevoke,
        targetType: 'api_key',
        targetId: apiKeyId,
      });
    });
  }
}
