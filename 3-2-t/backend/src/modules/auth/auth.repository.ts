import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { platformRoles: true },
    });
  }

  updateLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  listOrganizationMemberships(userId: string) {
    return this.prisma.organizationMembership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { organization: { name: 'asc' } },
    });
  }

  listProjectMemberships(userId: string) {
    return this.prisma.projectMembership.findMany({
      where: { userId },
      include: { project: true },
      orderBy: { project: { key: 'asc' } },
    });
  }

  findOrganizationAccess(userId: string, organizationId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: {
        userId,
        organizationId,
        status: 'active',
      },
      include: {
        organization: true,
      },
    });
  }

  findProjectAccess(userId: string, projectId: string) {
    return this.prisma.projectMembership.findFirst({
      where: {
        userId,
        projectId,
      },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    });
  }
}
