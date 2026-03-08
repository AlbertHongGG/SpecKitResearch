import { Controller, HttpCode, HttpStatus, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { ApiKeyStatus } from '@prisma/client';

import { RequireAdminGuard } from '../../guards/require-admin.guard';
import type { SessionPrincipal } from '../../shared/auth/auth.types';
import { PrismaService } from '../../shared/db/prisma.service';
import { AuditActions } from '../../shared/logging/audit-actions';
import { auditActorFromSession, writeAuditOrThrow } from '../../shared/logging/audit.decorators';
import { AuditLogService } from '../../shared/logging/audit-log.service';

type RequestWithSession = FastifyRequest & { session?: SessionPrincipal };

@Controller('api-keys')
@UseGuards(RequireAdminGuard)
export class ApiKeysAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  @Post(':apiKeyId/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  async block(@Param('apiKeyId') apiKeyId: string, @Req() req: RequestWithSession): Promise<void> {
    const existing = await this.prisma.apiKey.findUnique({ where: { id: apiKeyId }, select: { id: true, status: true } });
    if (!existing) {
      throw new NotFoundException({ error: { code: 'not_found', message: 'API key not found' } });
    }
    if (existing.status === ApiKeyStatus.blocked) return;

    const actor = auditActorFromSession(req.session!);
    await this.prisma.$transaction(async (tx) => {
      await tx.apiKey.update({
        where: { id: apiKeyId },
        data: { status: ApiKeyStatus.blocked, revokedAt: new Date() }
      });
      await writeAuditOrThrow({
        audit: this.audit,
        tx,
        actor,
        action: AuditActions.ApiKeyBlock,
        targetType: 'api_key',
        targetId: apiKeyId
      });
    });
  }
}
