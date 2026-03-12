import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProjectMembersRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findProject(projectId: string) {
    return this.prisma.project.findUnique({
      where: { id: projectId },
      include: { organization: true },
    });
  }

  listProjectMembers(projectId: string) {
    return this.prisma.projectMembership.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { user: { displayName: 'asc' } },
    });
  }

  findProjectMembership(projectId: string, membershipId: string) {
    return this.prisma.projectMembership.findFirst({
      where: { projectId, id: membershipId },
      include: { user: true },
    });
  }

  findProjectMembershipByUser(projectId: string, userId: string) {
    return this.prisma.projectMembership.findFirst({
      where: { projectId, userId },
    });
  }

  findOrgMembership(orgId: string, userId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: { organizationId: orgId, userId, status: 'active' },
    });
  }

  upsertProjectMembership(projectId: string, userId: string, projectRole: 'project_manager' | 'developer' | 'viewer') {
    return this.prisma.projectMembership.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      update: { projectRole },
      create: { projectId, userId, projectRole },
      include: { user: true },
    });
  }

  updateProjectMembership(membershipId: string, data: { projectRole?: 'project_manager' | 'developer' | 'viewer' }) {
    return this.prisma.projectMembership.update({
      where: { id: membershipId },
      data,
      include: { user: true },
    });
  }
}
