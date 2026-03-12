import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OrgMembersRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findOrganization(orgId: string) {
    return this.prisma.organization.findUnique({
      where: { id: orgId },
    });
  }

  findActiveMembership(orgId: string, userId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: {
        organizationId: orgId,
        userId,
        status: 'active',
      },
    });
  }

  listMembers(orgId: string) {
    return this.prisma.organizationMembership.findMany({
      where: { organizationId: orgId },
      include: { user: true },
      orderBy: [{ status: 'asc' }, { user: { displayName: 'asc' } }],
    });
  }

  findMembership(orgId: string, membershipId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: { organizationId: orgId, id: membershipId },
      include: { user: true },
    });
  }

  updateMembership(membershipId: string, data: { orgRole?: 'org_admin' | 'org_member'; status?: 'active' | 'removed' }) {
    return this.prisma.organizationMembership.update({
      where: { id: membershipId },
      data,
      include: { user: true },
    });
  }

  createInvite(input: { organizationId: string; email: string; token: string; invitedByUserId: string; expiresAt: Date }) {
    return this.prisma.organizationInvite.create({
      data: input,
    });
  }

  removeProjectMembershipsForOrganization(orgId: string, userId: string) {
    return this.prisma.projectMembership.deleteMany({
      where: {
        userId,
        project: {
          organizationId: orgId,
        },
      },
    });
  }
}
