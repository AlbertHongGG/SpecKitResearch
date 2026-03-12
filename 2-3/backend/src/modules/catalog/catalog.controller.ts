import { Controller, Get, UseGuards } from '@nestjs/common';
import { ResourceStatus, ScopeRuleEffect } from '@prisma/client';

import { RequireSessionGuard } from '../../guards/require-session.guard';
import { PrismaService } from '../../shared/db/prisma.service';

@Controller('catalog')
@UseGuards(RequireSessionGuard)
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const services = await this.prisma.apiService.findMany({
      where: { status: ResourceStatus.active },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        endpoints: {
          where: { status: ResourceStatus.active },
          orderBy: [{ method: 'asc' }, { path: 'asc' }],
          select: {
            id: true,
            method: true,
            path: true,
            description: true,
            scopeRules: {
              where: { effect: ScopeRuleEffect.allow },
              select: { scope: { select: { name: true } } },
            },
          },
        },
      },
    });

    return services.map((s) => ({
      service_id: s.id,
      name: s.name,
      description: s.description,
      endpoints: s.endpoints.map((e) => ({
        endpoint_id: e.id,
        method: e.method,
        path: e.path,
        description: e.description,
        required_scopes: e.scopeRules.map((r) => r.scope.name),
      })),
    }));
  }
}
