import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { OrganizationsAuditService } from '../organizations/organizations.audit';
import { ProjectMembersRepository } from './project-members.repository';

@Injectable()
export class ProjectMembersService {
  constructor(
    @Inject(ProjectMembersRepository) private readonly projectMembersRepository: ProjectMembersRepository,
    @Inject(OrganizationsAuditService) private readonly organizationsAuditService: OrganizationsAuditService,
  ) {}

  async listMembers(projectId: string, actor: { userId: string }) {
    await this.assertProjectAdmin(projectId, actor.userId);
    const members = await this.projectMembersRepository.listProjectMembers(projectId);
    return members.map((membership) => this.serializeMembership(membership));
  }

  async assignMember(
    projectId: string,
    input: { userId?: string; projectRole?: 'project_manager' | 'developer' | 'viewer' },
    actor: { userId: string; email: string },
  ) {
    const project = await this.assertProjectAdmin(projectId, actor.userId);
    const userId = input.userId ?? '';
    const role = input.projectRole ?? 'viewer';

    const orgMembership = await this.projectMembersRepository.findOrgMembership(project.organizationId, userId);
    if (!orgMembership) {
      throw resourceHidden('Organization member');
    }

    const existing = await this.projectMembersRepository.findProjectMembershipByUser(projectId, userId);
    const membership = await this.projectMembersRepository.upsertProjectMembership(projectId, userId, role);

    await this.organizationsAuditService.recordProjectRoleChanged({
      organizationId: project.organizationId,
      projectId,
      membershipId: membership.id,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      beforeJson: existing ? JSON.stringify(existing) : undefined,
      afterJson: JSON.stringify(this.serializeMembership(membership)),
    });

    return this.serializeMembership(membership);
  }

  async updateMember(
    projectId: string,
    membershipId: string,
    input: { projectRole?: 'project_manager' | 'developer' | 'viewer' },
    actor: { userId: string; email: string },
  ) {
    const project = await this.assertProjectAdmin(projectId, actor.userId);
    const existing = await this.projectMembersRepository.findProjectMembership(projectId, membershipId);
    if (!existing) {
      throw resourceHidden('Project member');
    }

    const updated = await this.projectMembersRepository.updateProjectMembership(membershipId, {
      projectRole: input.projectRole,
    });

    await this.organizationsAuditService.recordProjectRoleChanged({
      organizationId: project.organizationId,
      projectId,
      membershipId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      beforeJson: JSON.stringify(this.serializeMembership(existing)),
      afterJson: JSON.stringify(this.serializeMembership(updated)),
    });

    return this.serializeMembership(updated);
  }

  private async assertProjectAdmin(projectId: string, userId: string) {
    const project = await this.projectMembersRepository.findProject(projectId);
    if (!project) {
      throw resourceHidden('Project');
    }

    const orgMembership = await this.projectMembersRepository.findOrgMembership(project.organizationId, userId);
    if (!orgMembership) {
      throw resourceHidden('Project');
    }

    const projectMembership = await this.projectMembersRepository.findProjectMembershipByUser(projectId, userId);
    const canManage = orgMembership.orgRole === 'org_admin' || projectMembership?.projectRole === 'project_manager';
    if (!canManage) {
      throw new ForbiddenException({
        code: ERROR_CODES.ROLE_REQUIRED,
        message: 'Project manager or organization admin role is required.',
      });
    }

    return project;
  }

  private serializeMembership(membership: { id: string; userId: string; projectRole: string; user: { email: string; displayName: string } }) {
    return {
      membershipId: membership.id,
      userId: membership.userId,
      email: membership.user.email,
      displayName: membership.user.displayName,
      projectRole: membership.projectRole,
    };
  }
}
