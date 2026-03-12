import { randomBytes } from 'node:crypto';

import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { OrgMembersRepository } from './org-members.repository';
import { OrganizationsAuditService } from './organizations.audit';

@Injectable()
export class OrgMembersService {
  constructor(
    @Inject(OrgMembersRepository) private readonly orgMembersRepository: OrgMembersRepository,
    @Inject(OrganizationsAuditService) private readonly organizationsAuditService: OrganizationsAuditService,
  ) {}

  async getOrganizationOverview(orgId: string, actor: { userId: string }) {
    const organization = await this.orgMembersRepository.findOrganization(orgId);
    if (!organization) {
      throw resourceHidden('Organization');
    }
    const membership = await this.orgMembersRepository.findActiveMembership(orgId, actor.userId);
    if (!membership) {
      throw resourceHidden('Organization');
    }

    return {
      organizationId: organization.id,
      name: organization.name,
      plan: organization.plan,
      status: organization.status,
      myRole: membership.orgRole,
    };
  }

  async listMembers(orgId: string, actor: { userId: string }) {
    await this.assertOrgAdmin(orgId, actor.userId);
    const members = await this.orgMembersRepository.listMembers(orgId);
    return members.map((membership) => this.serializeMembership(membership));
  }

  async inviteMember(orgId: string, input: { email?: string }, actor: { userId: string; email: string }) {
    await this.assertOrgAdmin(orgId, actor.userId);
    const email = input.email?.trim().toLowerCase() ?? '';
    const invite = await this.orgMembersRepository.createInvite({
      organizationId: orgId,
      email,
      token: `invite-${randomBytes(8).toString('hex')}`,
      invitedByUserId: actor.userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });

    await this.organizationsAuditService.recordMemberInvited({
      organizationId: orgId,
      inviteId: invite.id,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      afterJson: JSON.stringify(invite),
    });

    return invite;
  }

  async updateMember(
    orgId: string,
    membershipId: string,
    input: { orgRole?: 'org_admin' | 'org_member'; status?: 'active' | 'removed' },
    actor: { userId: string; email: string },
  ) {
    await this.assertOrgAdmin(orgId, actor.userId);
    const existing = await this.orgMembersRepository.findMembership(orgId, membershipId);
    if (!existing) {
      throw resourceHidden('Organization member');
    }

    const updated = await this.orgMembersRepository.updateMembership(membershipId, {
      orgRole: input.orgRole,
      status: input.status,
    });

    if (input.status === 'removed') {
      await this.orgMembersRepository.removeProjectMembershipsForOrganization(orgId, updated.userId);
    }

    await this.organizationsAuditService.recordMemberUpdated({
      organizationId: orgId,
      membershipId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      beforeJson: JSON.stringify(this.serializeMembership(existing)),
      afterJson: JSON.stringify(this.serializeMembership(updated)),
      action: input.status === 'removed' ? 'member_removed' : 'member_role_changed',
    });

    return this.serializeMembership(updated);
  }

  private async assertOrgAdmin(orgId: string, userId: string) {
    const membership = await this.orgMembersRepository.findActiveMembership(orgId, userId);
    if (!membership) {
      throw resourceHidden('Organization');
    }
    if (membership.orgRole !== 'org_admin') {
      throw new ForbiddenException({
        code: ERROR_CODES.ROLE_REQUIRED,
        message: 'Organization admin role is required.',
      });
    }
  }

  private serializeMembership(membership: { id: string; userId: string; orgRole: string; status: string; user: { email: string; displayName: string } }) {
    return {
      membershipId: membership.id,
      userId: membership.userId,
      email: membership.user.email,
      displayName: membership.user.displayName,
      orgRole: membership.orgRole,
      status: membership.status,
    };
  }
}
