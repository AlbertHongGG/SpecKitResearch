import { Controller, Get, Patch, Post, Param, Req, Query, UseGuards, BadRequestException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { PrismaService } from '../../common/db/prisma.service';
import { CurrentAuth, RbacGuard, RequireRole, RequireSession } from '../../common/security/rbac.guard';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { makeActorFromAuth, makeAuditEvent } from '../logs/audit.emit';
import { enqueueAuditOrFailClosed } from '../logs/audit.policy';
import { AuditWriter } from '../logs/audit.writer';

const CreateEndpointSchema = z.object({
  serviceId: z.string().min(1),
  name: z.string().min(1).max(100),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']),
  pathPattern: z.string().min(1).max(200),
  status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE'),
});

const UpdateEndpointSchema = CreateEndpointSchema.partial().extend({
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
});

@Controller('/admin/endpoints')
@UseGuards(RbacGuard)
@RequireSession()
@RequireRole('ADMIN')
export class AdminEndpointsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriter,
  ) {}

  @Get()
  async list(@Query('serviceId') serviceId?: string) {
    const items = await this.prisma.apiEndpoint.findMany({
      where: serviceId ? { serviceId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return { items };
  }

  @Post()
  async create(@Req() req: FastifyRequest, @CurrentAuth() auth: any) {
    const body = new ZodValidationPipe(CreateEndpointSchema).transform((req as any).body);

    enqueueAuditOrFailClosed(
      this.audit,
      makeAuditEvent({
        ...makeActorFromAuth(auth),
        requestId: (req as any).id,
        action: 'endpoint.create',
        targetType: 'api_endpoint',
        targetId: `${body.serviceId}:${body.method}:${body.pathPattern}`,
        success: true,
        metadata: { name: body.name, status: body.status },
      }),
    );

    try {
      const created = await this.prisma.apiEndpoint.create({
        data: {
          serviceId: body.serviceId,
          name: body.name,
          method: body.method,
          pathPattern: body.pathPattern,
          status: body.status,
        },
      });
      return { item: created };
    } catch {
      throw new BadRequestException('Failed to create endpoint');
    }
  }

  @Patch('/:id')
  async update(@Param('id') id: string, @Req() req: FastifyRequest, @CurrentAuth() auth: any) {
    const body = new ZodValidationPipe(UpdateEndpointSchema).transform((req as any).body);

    enqueueAuditOrFailClosed(
      this.audit,
      makeAuditEvent({
        ...makeActorFromAuth(auth),
        requestId: (req as any).id,
        action: body.status === undefined ? 'endpoint.update' : 'endpoint.toggle',
        targetType: 'api_endpoint',
        targetId: id,
        success: true,
        metadata: {
          service_id: body.serviceId ?? null,
          name: body.name ?? null,
          method: body.method ?? null,
          path_pattern: body.pathPattern ?? null,
          status: body.status ?? null,
        },
      }),
    );

    const updated = await this.prisma.apiEndpoint.update({
      where: { id },
      data: {
        serviceId: body.serviceId,
        name: body.name,
        method: body.method,
        pathPattern: body.pathPattern,
        status: body.status,
      },
    });
    return { item: updated };
  }
}
