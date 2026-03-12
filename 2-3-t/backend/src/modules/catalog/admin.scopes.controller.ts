import { Controller, Get, Patch, Post, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { PrismaService } from '../../common/db/prisma.service';
import { CurrentAuth, RbacGuard, RequireRole, RequireSession } from '../../common/security/rbac.guard';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';

const CreateScopeSchema = z.object({
  key: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE'),
});
const UpdateScopeSchema = CreateScopeSchema.partial().extend({
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
});

@Controller('/admin/scopes')
@UseGuards(RbacGuard)
@RequireSession()
@RequireRole('ADMIN')
export class AdminScopesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const items = await this.prisma.apiScope.findMany({ orderBy: { createdAt: 'desc' } });
    return { items };
  }

  @Post()
  async create(@Req() req: FastifyRequest, @CurrentAuth() _auth: any) {
    const body = new ZodValidationPipe(CreateScopeSchema).transform((req as any).body);
    try {
      const created = await this.prisma.apiScope.create({
        data: { key: body.key, description: body.description, status: body.status },
      });
      return { item: created };
    } catch {
      throw new BadRequestException('Failed to create scope');
    }
  }

  @Patch('/:id')
  async update(@Param('id') id: string, @Req() req: FastifyRequest) {
    const body = new ZodValidationPipe(UpdateScopeSchema).transform((req as any).body);
    const updated = await this.prisma.apiScope.update({
      where: { id },
      data: { key: body.key, description: body.description, status: body.status },
    });
    return { item: updated };
  }
}
