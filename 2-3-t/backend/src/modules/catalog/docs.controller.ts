import { Controller, Get, UseGuards } from '@nestjs/common';

import { PrismaService } from '../../common/db/prisma.service';
import { RbacGuard, RequireSession } from '../../common/security/rbac.guard';

@Controller('/docs')
@UseGuards(RbacGuard)
@RequireSession()
export class DocsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async docs() {
    const services = await this.prisma.apiService.findMany({
      where: { status: 'ACTIVE' },
      include: {
        endpoints: {
          where: { status: 'ACTIVE' },
          include: { scopeAllows: { include: { scope: true } } },
          orderBy: [{ method: 'asc' }, { pathPattern: 'asc' }],
        },
      },
      orderBy: { slug: 'asc' },
    });

    return {
      services: services.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        endpoints: s.endpoints.map((e) => ({
          id: e.id,
          http_method: e.method,
          path_pattern: e.pathPattern,
          status: e.status === 'ACTIVE' ? 'active' : 'disabled',
          required_scopes: e.scopeAllows.map((a) => a.scope.key),
        })),
      })),
    };
  }
}
