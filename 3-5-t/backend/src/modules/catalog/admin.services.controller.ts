import { Controller, Get, Patch, Post, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { PrismaService } from '../../common/db/prisma.service';
import { CurrentAuth, RbacGuard, RequireRole, RequireSession } from '../../common/security/rbac.guard';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { makeActorFromAuth, makeAuditEvent } from '../logs/audit.emit';
import { enqueueAuditOrFailClosed } from '../logs/audit.policy';
import { AuditWriter } from '../logs/audit.writer';

const CreateServiceSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  upstreamUrl: z.string().url(),
  status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE'),
});

const UpdateServiceSchema = CreateServiceSchema.partial().extend({
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
});

@Controller('/admin/services')
@UseGuards(RbacGuard)
@RequireSession()
@RequireRole('ADMIN')
export class AdminServicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriter,
  ) {}

  @Get()
  async list() {
    const items = await this.prisma.apiService.findMany({ orderBy: { createdAt: 'desc' } });
    return { items };
  }

  @Post()
  async create(@Req() req: FastifyRequest, @CurrentAuth() auth: any) {
    const body = new ZodValidationPipe(CreateServiceSchema).transform((req as any).body);

    enqueueAuditOrFailClosed(
      this.audit,
      makeAuditEvent({
        ...makeActorFromAuth(auth),
        requestId: (req as any).id,
        action: 'service.create',
        targetType: 'api_service',
        targetId: body.slug,
        success: true,
        metadata: { name: body.name, upstream_url: body.upstreamUrl, status: body.status },
      }),
    );

    try {
      const created = await this.prisma.apiService.create({
        data: {
          slug: body.slug,
          name: body.name,
          upstreamUrl: body.upstreamUrl,
          status: body.status,
        },
      });
      return { item: created };
    } catch (e: any) {
      throw new BadRequestException('Failed to create service');
    }
  }

  @Patch('/:id')
  async update(@Param('id') id: string, @Req() req: FastifyRequest, @CurrentAuth() auth: any) {
    const body = new ZodValidationPipe(UpdateServiceSchema).transform((req as any).body);

    enqueueAuditOrFailClosed(
      this.audit,
      makeAuditEvent({
        ...makeActorFromAuth(auth),
        requestId: (req as any).id,
        action: 'service.update',
        targetType: 'api_service',
        targetId: id,
        success: true,
        metadata: {
          slug: body.slug ?? null,
          name: body.name ?? null,
          upstream_url: body.upstreamUrl ?? null,
          status: body.status ?? null,
        },
      }),
    );

    const updated = await this.prisma.apiService.update({
      where: { id },
      data: {
        slug: body.slug,
        name: body.name,
        upstreamUrl: body.upstreamUrl,
        status: body.status,
      },
    });
    return { item: updated };
  }
}
