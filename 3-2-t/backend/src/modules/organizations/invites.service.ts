import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { AuthAuditService } from '../auth/auth.audit';
import { AuthRepository } from '../auth/auth.repository';
import { InvitesRepository } from './invites.repository';

@Injectable()
export class InvitesService {
  constructor(
    @Inject(InvitesRepository) private readonly invitesRepository: InvitesRepository,
    @Inject(AuthRepository) private readonly authRepository: AuthRepository,
    @Inject(AuthAuditService) private readonly authAuditService: AuthAuditService,
  ) {}

  async acceptInvite(token: string, userId: string) {
    const invite = await this.invitesRepository.findByToken(token);
    if (!invite) {
      throw resourceHidden('Invite');
    }

    if (invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new ForbiddenException({
        code: 'INVITE_INVALID',
        message: 'Invite token is expired or has already been used.',
      });
    }

    const membership = await this.invitesRepository.upsertMembership(invite.organizationId, userId);
    await this.invitesRepository.acceptInvite(invite.id);

    const user = await this.authRepository.findUserByEmail(invite.email);
    await this.authAuditService.recordInviteAccepted(userId, user?.email ?? invite.email, invite.organizationId, invite.id);

    return {
      organizationId: invite.organizationId,
      organizationName: invite.organization.name,
      membershipId: membership.id,
    };
  }
}
