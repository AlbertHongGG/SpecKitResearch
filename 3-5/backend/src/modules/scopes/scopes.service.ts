import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SessionPrincipal } from '../../shared/auth/auth.types';
import { PrismaService } from '../../shared/db/prisma.service';
import { AuditActions } from '../../shared/logging/audit-actions';
import { auditActorFromSession, writeAuditOrThrow } from '../../shared/logging/audit.decorators';
import { AuditLogService } from '../../shared/logging/audit-log.service';

@Injectable()
export class ScopesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(): Promise<any[]> {
    return this.prisma.apiScope.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(principal: SessionPrincipal, input: { name: string; description: string }): Promise<any> {
    const actor = auditActorFromSession(principal);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.apiScope.create({ data: { name: input.name, description: input.description } });
        await writeAuditOrThrow({
          audit: this.audit,
          tx,
          actor,
          action: AuditActions.AdminScopeCreate,
          targetType: 'api_scope',
          targetId: created.id,
          metadata: { name: created.name }
        });
        return created;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ error: { code: 'conflict', message: 'Scope name already exists' } });
      }
      throw err;
    }
  }

  async update(principal: SessionPrincipal, scopeId: string, input: Partial<{ name: string; description: string }>): Promise<any> {
    const existing = await this.prisma.apiScope.findUnique({ where: { id: scopeId } });
    if (!existing) {
      throw new NotFoundException({ error: { code: 'not_found', message: 'Scope not found' } });
    }

    const actor = auditActorFromSession(principal);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.apiScope.update({
          where: { id: scopeId },
          data: {
            ...(typeof input.name === 'string' ? { name: input.name } : {}),
            ...(typeof input.description === 'string' ? { description: input.description } : {})
          }
        });
        await writeAuditOrThrow({
          audit: this.audit,
          tx,
          actor,
          action: AuditActions.AdminScopeUpdate,
          targetType: 'api_scope',
          targetId: scopeId,
          metadata: { updated_fields: Object.keys(input) }
        });
        return updated;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ error: { code: 'conflict', message: 'Scope name already exists' } });
      }
      throw err;
    }
  }
}
