import { Inject, Injectable } from '@nestjs/common';

import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { AuthRepository } from '../auth/auth.repository';

@Injectable()
export class OrgSwitchService {
  constructor(@Inject(AuthRepository) private readonly authRepository: AuthRepository) {}

  async listOrganizations(userId: string) {
    const memberships = await this.authRepository.listOrganizationMemberships(userId);

    return memberships
      .filter((membership) => membership.status === 'active')
      .map((membership) => ({
        organizationId: membership.organizationId,
        name: membership.organization.name,
        role: membership.orgRole,
        status: membership.organization.status,
        plan: membership.organization.plan,
      }));
  }

  async switchOrganization(userId: string, organizationId: string) {
    const organizations = await this.listOrganizations(userId);
    const organization = organizations.find((candidate) => candidate.organizationId === organizationId);
    if (!organization) {
      throw resourceHidden('Organization');
    }

    return organization;
  }
}
