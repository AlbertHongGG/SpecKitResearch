import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { throwNotFound } from './existence-strategy.js';

@Injectable()
export class TenantAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireOrgMembership(userId: string, orgId: string) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { organization: true },
    });

    if (!membership || membership.status !== 'active') {
      throwNotFound();
    }

    return membership;
  }

  async requireProjectMembership(userId: string, projectId: string) {
    const membership = await this.prisma.projectMembership.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: { project: { include: { organization: true } } },
    });

    if (!membership) {
      throwNotFound();
    }

    return membership;
  }
}
