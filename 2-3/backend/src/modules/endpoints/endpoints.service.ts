import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SessionPrincipal } from '../../shared/auth/auth.types';
import { PrismaService } from '../../shared/db/prisma.service';
import { AuditActions } from '../../shared/logging/audit-actions';
import { auditActorFromSession, writeAuditOrThrow } from '../../shared/logging/audit.decorators';
import { AuditLogService } from '../../shared/logging/audit-log.service';

@Injectable()
export class EndpointsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(params?: { serviceId?: string }): Promise<any[]> {
    return this.prisma.apiEndpoint.findMany({
      where: params?.serviceId ? { serviceId: params.serviceId } : undefined,
      orderBy: { id: 'desc' },
      include: { service: true }
    });
  }

  private async assertUnique(serviceId: string, method: string, path: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.apiEndpoint.findFirst({
      where: {
        serviceId,
        method: method as any,
        path,
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      },
      select: { id: true }
    });

    if (existing) {
      throw new ConflictException({ error: { code: 'conflict', message: 'Endpoint already exists for service/method/path' } });
    }
  }

  async createForService(
    principal: SessionPrincipal,
    serviceId: string,
    input: { method: string; path: string; description?: string; status: 'active' | 'disabled' },
  ): Promise<any> {
    await this.assertUnique(serviceId, input.method, input.path);
    const actor = auditActorFromSession(principal);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.apiEndpoint.create({
          data: {
            serviceId,
            method: input.method as any,
            path: input.path,
            description: input.description,
            status: input.status
          },
          include: { service: true }
        });

        await writeAuditOrThrow({
          audit: this.audit,
          tx,
          actor,
          action: AuditActions.AdminEndpointCreate,
          targetType: 'api_endpoint',
          targetId: created.id,
          metadata: { service_id: serviceId, method: created.method, path: created.path }
        });

        return created;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ error: { code: 'conflict', message: 'Endpoint already exists for service/method/path' } });
      }
      throw err;
    }
  }

  async update(
    principal: SessionPrincipal,
    endpointId: string,
    input: Partial<{ method: string; path: string; description: string | null; status: 'active' | 'disabled' }>,
  ): Promise<any> {
    const existing = await this.prisma.apiEndpoint.findUnique({ where: { id: endpointId } });
    if (!existing) {
      throw new NotFoundException({ error: { code: 'not_found', message: 'Endpoint not found' } });
    }

    const nextServiceId = existing.serviceId;
    const nextMethod = typeof input.method === 'string' ? input.method : existing.method;
    const nextPath = typeof input.path === 'string' ? input.path : existing.path;
    await this.assertUnique(nextServiceId, String(nextMethod), String(nextPath), endpointId);

    const actor = auditActorFromSession(principal);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.apiEndpoint.update({
          where: { id: endpointId },
          data: {
            ...(typeof input.method === 'string' ? { method: input.method as any } : {}),
            ...(typeof input.path === 'string' ? { path: input.path } : {}),
            ...(Object.prototype.hasOwnProperty.call(input, 'description') ? { description: input.description } : {}),
            ...(typeof input.status === 'string' ? { status: input.status } : {})
          },
          include: { service: true }
        });

        await writeAuditOrThrow({
          audit: this.audit,
          tx,
          actor,
          action: AuditActions.AdminEndpointUpdate,
          targetType: 'api_endpoint',
          targetId: endpointId,
          metadata: { updated_fields: Object.keys(input) }
        });

        return updated;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ error: { code: 'conflict', message: 'Endpoint already exists for service/method/path' } });
      }
      throw err;
    }
  }
}
