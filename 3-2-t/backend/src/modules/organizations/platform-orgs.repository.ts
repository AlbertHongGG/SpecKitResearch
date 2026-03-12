import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PlatformOrgsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listOrganizations() {
    return this.prisma.organization.findMany({
      include: {
        memberships: {
          where: { status: 'active' },
        },
        projects: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  findOrganization(orgId: string) {
    return this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        memberships: {
          where: { status: 'active' },
        },
        projects: true,
      },
    });
  }

  createOrganization(input: { name: string; plan: 'free' | 'paid'; createdByUserId: string }) {
    return this.prisma.organization.create({
      data: input,
      include: {
        memberships: true,
        projects: true,
      },
    });
  }

  updateOrganization(orgId: string, input: { name?: string; plan?: 'free' | 'paid'; status?: 'active' | 'suspended' }) {
    return this.prisma.organization.update({
      where: { id: orgId },
      data: input,
      include: {
        memberships: {
          where: { status: 'active' },
        },
        projects: true,
      },
    });
  }
}
