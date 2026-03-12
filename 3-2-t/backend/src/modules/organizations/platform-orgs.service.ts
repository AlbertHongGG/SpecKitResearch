import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { OrganizationsAuditService } from './organizations.audit';
import { PlatformOrgsRepository } from './platform-orgs.repository';

@Injectable()
export class PlatformOrgsService {
  constructor(
    @Inject(PlatformOrgsRepository) private readonly platformOrgsRepository: PlatformOrgsRepository,
    @Inject(OrganizationsAuditService) private readonly organizationsAuditService: OrganizationsAuditService,
  ) {}

  async listOrganizations(actor: { platformRoles: string[] }) {
    this.assertPlatformAdmin(actor.platformRoles);
    const organizations = await this.platformOrgsRepository.listOrganizations();
    return organizations.map((organization) => this.serializeOrganization(organization));
  }

  async createOrganization(input: { name?: string; plan?: 'free' | 'paid' }, actor: { userId: string; email: string; platformRoles: string[] }) {
    this.assertPlatformAdmin(actor.platformRoles);
    const organization = await this.platformOrgsRepository.createOrganization({
      name: input.name?.trim() || 'New Organization',
      plan: input.plan ?? 'free',
      createdByUserId: actor.userId,
    });

    await this.organizationsAuditService.recordOrganizationCreated({
      organizationId: organization.id,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      afterJson: JSON.stringify(this.serializeOrganization(organization)),
    });

    return this.serializeOrganization(organization);
  }

  async updateOrganization(orgId: string, input: { name?: string; plan?: 'free' | 'paid'; status?: 'active' | 'suspended' }, actor: { userId: string; email: string; platformRoles: string[] }) {
    this.assertPlatformAdmin(actor.platformRoles);
    const existing = await this.platformOrgsRepository.findOrganization(orgId);
    if (!existing) {
      throw resourceHidden('Organization');
    }

    const updated = await this.platformOrgsRepository.updateOrganization(orgId, {
      name: input.name?.trim() || undefined,
      plan: input.plan,
      status: input.status,
    });

    await this.organizationsAuditService.recordOrganizationUpdated({
      organizationId: orgId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      beforeJson: JSON.stringify(this.serializeOrganization(existing)),
      afterJson: JSON.stringify(this.serializeOrganization(updated)),
    });

    if (input.status && input.status !== existing.status) {
      await this.organizationsAuditService.recordOrganizationStatusChanged({
        organizationId: orgId,
        actorUserId: actor.userId,
        actorEmail: actor.email,
        beforeJson: JSON.stringify(this.serializeOrganization(existing)),
        afterJson: JSON.stringify(this.serializeOrganization(updated)),
        action: input.status === 'suspended' ? 'organization_suspended' : 'organization_unsuspended',
      });
    }

    return this.serializeOrganization(updated);
  }

  private assertPlatformAdmin(platformRoles: string[]) {
    if (!platformRoles.includes('platform_admin')) {
      throw new ForbiddenException({
        code: ERROR_CODES.ROLE_REQUIRED,
        message: 'Platform admin role is required.',
      });
    }
  }

  private serializeOrganization(organization: { id: string; name: string; plan: string; status: string; memberships: Array<unknown>; projects: Array<unknown> }) {
    return {
      organizationId: organization.id,
      name: organization.name,
      plan: organization.plan,
      status: organization.status,
      memberCount: organization.memberships.length,
      projectCount: organization.projects.length,
    };
  }
}
