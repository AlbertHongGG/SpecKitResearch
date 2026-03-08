import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SessionPrincipal } from '../../shared/auth/auth.types';
import { PrismaService } from '../../shared/db/prisma.service';
import { AuditActions } from '../../shared/logging/audit-actions';
import { auditActorFromSession, writeAuditOrThrow } from '../../shared/logging/audit.decorators';
import { AuditLogService } from '../../shared/logging/audit-log.service';

import { ServicesRepository } from './services.repository';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ServicesRepository,
    private readonly audit: AuditLogService,
  ) {}

  async list(): Promise<any[]> {
    return this.repo.list();
  }

  async create(principal: SessionPrincipal, input: { name: string; description: string; status: 'active' | 'disabled' }): Promise<any> {
    const actor = auditActorFromSession(principal);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await this.repo.create(
          {
            name: input.name,
            description: input.description,
            status: input.status
          },
          tx
        );

        await writeAuditOrThrow({
          audit: this.audit,
          tx,
          actor,
          action: AuditActions.AdminServiceCreate,
          targetType: 'api_service',
          targetId: created.id,
          metadata: { name: created.name }
        });
        return created;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ error: { code: 'conflict', message: 'Service name already exists' } });
      }
      throw err;
    }
  }

  async update(
    principal: SessionPrincipal,
    serviceId: string,
    input: Partial<{ name: string; description: string; status: 'active' | 'disabled' }>,
  ): Promise<any> {
    const existing = await this.repo.findById(serviceId);
    if (!existing) {
      throw new NotFoundException({ error: { code: 'not_found', message: 'Service not found' } });
    }

    const actor = auditActorFromSession(principal);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await this.repo.update(
          serviceId,
          {
            ...(typeof input.name === 'string' ? { name: input.name } : {}),
            ...(typeof input.description === 'string' ? { description: input.description } : {}),
            ...(typeof input.status === 'string' ? { status: input.status } : {})
          },
          tx
        );

        await writeAuditOrThrow({
          audit: this.audit,
          tx,
          actor,
          action: AuditActions.AdminServiceUpdate,
          targetType: 'api_service',
          targetId: serviceId,
          metadata: { updated_fields: Object.keys(input) }
        });

        return updated;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ error: { code: 'conflict', message: 'Service name already exists' } });
      }
      throw err;
    }
  }
}
