import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrganizationsAuditService } from '../organizations/organizations.audit';
import { ProjectMembersRepository } from './project-members.repository';

@Injectable()
export class ProjectArchiveService {
  constructor(
    @Inject(ProjectMembersRepository) private readonly projectMembersRepository: ProjectMembersRepository,
    @Inject(OrganizationsAuditService) private readonly organizationsAuditService: OrganizationsAuditService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async archiveProject(projectId: string, actor: { userId: string; email: string }) {
    const project = await this.projectMembersRepository.findProject(projectId);
    if (!project) {
      throw resourceHidden('Project');
    }

    const orgMembership = await this.projectMembersRepository.findOrgMembership(project.organizationId, actor.userId);
    if (!orgMembership) {
      throw resourceHidden('Project');
    }

    const projectMembership = await this.projectMembersRepository.findProjectMembershipByUser(projectId, actor.userId);
    const canArchive = orgMembership.orgRole === 'org_admin' || projectMembership?.projectRole === 'project_manager';
    if (!canArchive) {
      throw new ForbiddenException({
        code: ERROR_CODES.ROLE_REQUIRED,
        message: 'Project manager or organization admin role is required.',
      });
    }

    if (project.status === 'archived') {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: 'Project is already archived.',
      });
    }

    const archived = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'archived' },
    });

    await this.organizationsAuditService.recordProjectArchived({
      organizationId: project.organizationId,
      projectId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      beforeJson: JSON.stringify(this.serializeProject(project)),
      afterJson: JSON.stringify(this.serializeProject(archived)),
    });

    return this.serializeProject(archived);
  }

  private serializeProject(project: { id: string; organizationId: string; key: string; name: string; type: string; status: string }) {
    return {
      projectId: project.id,
      organizationId: project.organizationId,
      key: project.key,
      name: project.name,
      type: project.type,
      status: project.status,
    };
  }
}
