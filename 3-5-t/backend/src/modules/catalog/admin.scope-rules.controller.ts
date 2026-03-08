import { Controller, Delete, Get, Post, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { PrismaService } from '../../common/db/prisma.service';
import { CurrentAuth, RbacGuard, RequireRole, RequireSession } from '../../common/security/rbac.guard';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { makeActorFromAuth, makeAuditEvent } from '../logs/audit.emit';
import { enqueueAuditOrFailClosed } from '../logs/audit.policy';
import { AuditWriter } from '../logs/audit.writer';

const AddRuleSchema = z.object({
  endpointId: z.string().min(1),
  scopeId: z.string().min(1),
});

@Controller('/admin/scope-rules')
@UseGuards(RbacGuard)
@RequireSession()
@RequireRole('ADMIN')
export class AdminScopeRulesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriter,
  ) {}

  @Get()
  async list(@Query('endpointId') endpointId?: string) {
    const items = await this.prisma.endpointScopeAllow.findMany({
      where: endpointId ? { endpointId } : undefined,
      include: { endpoint: true, scope: true },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: items.map((i) => ({
        id: i.id,
        endpointId: i.endpointId,
        scopeId: i.scopeId,
        scopeKey: i.scope.key,
      })),
    };
  }

  @Post()
  async add(@Req() req: FastifyRequest, @CurrentAuth() auth: any) {
    const body = new ZodValidationPipe(AddRuleSchema).transform((req as any).body);

    enqueueAuditOrFailClosed(
      this.audit,
      makeAuditEvent({
        ...makeActorFromAuth(auth),
        requestId: (req as any).id,
        action: 'scope_rule.add',
        targetType: 'endpoint_scope_allow',
        targetId: `${body.endpointId}:${body.scopeId}`,
        success: true,
      }),
    );

    try {
      const created = await this.prisma.endpointScopeAllow.create({
        data: { endpointId: body.endpointId, scopeId: body.scopeId },
      });
      return { item: created };
    } catch {
      throw new BadRequestException('Failed to add scope rule');
    }
  }

  @Delete()
  async remove(
    @Req() req: FastifyRequest,
    @CurrentAuth() auth: any,
    @Query('endpointId') endpointId?: string,
    @Query('scopeId') scopeId?: string,
  ) {
    if (!endpointId || !scopeId) throw new BadRequestException('endpointId and scopeId are required');

    enqueueAuditOrFailClosed(
      this.audit,
      makeAuditEvent({
        ...makeActorFromAuth(auth),
        requestId: (req as any).id,
        action: 'scope_rule.delete',
        targetType: 'endpoint_scope_allow',
        targetId: `${endpointId}:${scopeId}`,
        success: true,
      }),
    );

    await this.prisma.endpointScopeAllow.delete({ where: { endpointId_scopeId: { endpointId, scopeId } } });
    return { ok: true };
  }
}
