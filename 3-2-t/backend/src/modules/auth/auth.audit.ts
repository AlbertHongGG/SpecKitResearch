import { Inject, Injectable } from '@nestjs/common';

import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class AuthAuditService {
  constructor(@Inject(AuditLogService) private readonly auditLogService: AuditLogService) {}

  recordLogin(actorUserId: string, actorEmail: string) {
    return this.auditLogService.record({
      action: 'user_logged_in',
      entityType: 'user',
      entityId: actorUserId,
      actorUserId,
      actorEmail,
    });
  }

  recordInviteAccepted(actorUserId: string, actorEmail: string, organizationId: string, inviteId: string) {
    return this.auditLogService.record({
      action: 'invite_accepted',
      entityType: 'organization_invite',
      entityId: inviteId,
      actorUserId,
      actorEmail,
      organizationId,
    });
  }
}
