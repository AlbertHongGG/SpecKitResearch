import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrgMembersRepository } from '../organizations/org-members.repository';
import { OrganizationsAuditService } from '../organizations/organizations.audit';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrgMembersRepository) private readonly orgMembersRepository: OrgMembersRepository,
    @Inject(OrganizationsAuditService) private readonly organizationsAuditService: OrganizationsAuditService,
  ) {}

  async listOrganizationProjects(orgId: string, actor: { userId: string }) {
    const membership = await this.orgMembersRepository.findActiveMembership(orgId, actor.userId);
    if (!membership) {
      throw resourceHidden('Organization');
    }

    const projects = await this.prisma.project.findMany({
      where: { organizationId: orgId },
      include: { memberships: true },
      orderBy: { key: 'asc' },
    });

    return projects.map((project) => ({
      projectId: project.id,
      key: project.key,
      name: project.name,
      type: project.type,
      status: project.status,
      memberCount: project.memberships.length,
    }));
  }

  async createProject(
    orgId: string,
    input: { key?: string; name?: string; type?: 'scrum' | 'kanban' },
    actor: { userId: string; email: string },
  ) {
    const membership = await this.orgMembersRepository.findActiveMembership(orgId, actor.userId);
    if (!membership) {
      throw resourceHidden('Organization');
    }
    if (membership.orgRole !== 'org_admin') {
      throw new ForbiddenException({
        code: ERROR_CODES.ROLE_REQUIRED,
        message: 'Organization admin role is required.',
      });
    }

    const key = input.key?.trim().toUpperCase() ?? '';
    if (!key || !/^[A-Z][A-Z0-9_]+$/.test(key)) {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: 'Project key must start with a letter and contain only A-Z, 0-9, or underscore.',
      });
    }

    const project = await this.prisma.project.create({
      data: {
        organizationId: orgId,
        key,
        name: input.name?.trim() || key,
        type: input.type ?? 'scrum',
        createdByUserId: actor.userId,
        memberships: {
          create: {
            userId: actor.userId,
            projectRole: 'project_manager',
          },
        },
      },
    });

    await this.organizationsAuditService.recordProjectCreated({
      organizationId: orgId,
      projectId: project.id,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      afterJson: JSON.stringify({ projectId: project.id, key: project.key, name: project.name, type: project.type }),
    });

    return {
      projectId: project.id,
      key: project.key,
      name: project.name,
      type: project.type,
      status: project.status,
    };
  }
}
