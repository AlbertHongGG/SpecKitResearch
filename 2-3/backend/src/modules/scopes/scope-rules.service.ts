import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ScopeRuleEffect } from '@prisma/client';

import type { SessionPrincipal } from '../../shared/auth/auth.types';
import { PrismaService } from '../../shared/db/prisma.service';
import { AuditActions } from '../../shared/logging/audit-actions';
import { auditActorFromSession, writeAuditOrThrow } from '../../shared/logging/audit.decorators';
import { AuditLogService } from '../../shared/logging/audit-log.service';

@Injectable()
export class ScopeRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(params?: { scopeId?: string; endpointId?: string }): Promise<any[]> {
    return this.prisma.apiScopeRule.findMany({
      where: {
        ...(params?.scopeId ? { scopeId: params.scopeId } : {}),
        ...(params?.endpointId ? { endpointId: params.endpointId } : {})
      },
      include: { scope: true, endpoint: { include: { service: true } } },
      orderBy: { id: 'desc' }
    });
  }

  async create(principal: SessionPrincipal, input: { scopeId: string; endpointId: string }): Promise<any> {
    const actor = auditActorFromSession(principal);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const scope = await tx.apiScope.findUnique({ where: { id: input.scopeId }, select: { id: true } });
        if (!scope) throw new NotFoundException({ error: { code: 'not_found', message: 'Scope not found' } });

        const endpoint = await tx.apiEndpoint.findUnique({ where: { id: input.endpointId }, select: { id: true } });
        if (!endpoint) throw new NotFoundException({ error: { code: 'not_found', message: 'Endpoint not found' } });

        const created = await tx.apiScopeRule.create({
          data: {
            scopeId: input.scopeId,
            endpointId: input.endpointId,
            effect: ScopeRuleEffect.allow
          },
          include: { scope: true, endpoint: { include: { service: true } } }
        });

        await writeAuditOrThrow({
          audit: this.audit,
          tx,
          actor,
          action: AuditActions.AdminScopeRuleCreate,
          targetType: 'api_scope_rule',
          targetId: created.id,
          metadata: { scope_id: input.scopeId, endpoint_id: input.endpointId }
        });

        return created;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ error: { code: 'conflict', message: 'Scope rule already exists' } });
      }
      throw err;
    }
  }

  async delete(principal: SessionPrincipal, scopeRuleId: string): Promise<void> {
    const existing = await this.prisma.apiScopeRule.findUnique({ where: { id: scopeRuleId }, select: { id: true } });
    if (!existing) return;

    const actor = auditActorFromSession(principal);
    await this.prisma.$transaction(async (tx) => {
      await tx.apiScopeRule.delete({ where: { id: scopeRuleId } });
      await writeAuditOrThrow({
        audit: this.audit,
        tx,
        actor,
        action: AuditActions.AdminScopeRuleDelete,
        targetType: 'api_scope_rule',
        targetId: scopeRuleId
      });
    });
  }
}
