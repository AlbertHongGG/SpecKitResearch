import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { OrganizationsAuditService } from './organizations.audit';
import { PlatformOrgsRepository } from './platform-orgs.repository';

@Injectable()
export class OrgStatusService {
  constructor(
    @Inject(PlatformOrgsRepository) private readonly platformOrgsRepository: PlatformOrgsRepository,
    @Inject(OrganizationsAuditService) private readonly organizationsAuditService: OrganizationsAuditService,
  ) {}

  async updateStatus(
    orgId: string,
    status: 'active' | 'suspended',
    actor: { userId: string; email: string; platformRoles: string[] },
  ) {
    if (!actor.platformRoles.includes('platform_admin')) {
      throw new ForbiddenException({
        code: ERROR_CODES.ROLE_REQUIRED,
        message: 'Platform admin role is required.',
      });
    }

    const existing = await this.platformOrgsRepository.findOrganization(orgId);
    if (!existing) {
      throw resourceHidden('Organization');
    }

    const updated = await this.platformOrgsRepository.updateOrganization(orgId, { status });
    if (existing.status !== status) {
      await this.organizationsAuditService.recordOrganizationStatusChanged({
        organizationId: orgId,
        actorUserId: actor.userId,
        actorEmail: actor.email,
        beforeJson: JSON.stringify(this.serialize(existing)),
        afterJson: JSON.stringify(this.serialize(updated)),
        action: status === 'suspended' ? 'organization_suspended' : 'organization_unsuspended',
      });
    }

    return this.serialize(updated);
  }

  private serialize(organization: { id: string; name: string; plan: string; status: string }) {
    return {
      organizationId: organization.id,
      name: organization.name,
      plan: organization.plan,
      status: organization.status,
    };
  }
}
