import { Controller, Get, UseGuards } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';

@Controller('orgs')
export class OrgsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(SessionGuard)
  async listOrgs(@CurrentUser() user: RequestWithUser['user']) {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId: user!.id, status: 'active' },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        status: m.organization.status,
        plan: m.organization.plan,
        roleInOrg: m.orgRole,
      })),
    };
  }

}
