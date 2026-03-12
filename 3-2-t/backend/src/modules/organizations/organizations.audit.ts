import { Inject, Injectable } from '@nestjs/common';

import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class OrganizationsAuditService {
  constructor(@Inject(AuditLogService) private readonly auditLogService: AuditLogService) {}

  recordOrganizationCreated(input: { organizationId: string; actorUserId: string; actorEmail: string; afterJson: string }) {
    return this.auditLogService.record({
      action: 'organization_created',
      entityType: 'organization',
      entityId: input.organizationId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      afterJson: input.afterJson,
    });
  }

  recordOrganizationUpdated(input: { organizationId: string; actorUserId: string; actorEmail: string; beforeJson: string; afterJson: string }) {
    return this.auditLogService.record({
      action: 'organization_plan_changed',
      entityType: 'organization',
      entityId: input.organizationId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      beforeJson: input.beforeJson,
      afterJson: input.afterJson,
    });
  }

  recordOrganizationStatusChanged(input: {
    organizationId: string;
    actorUserId: string;
    actorEmail: string;
    beforeJson: string;
    afterJson: string;
    action: 'organization_suspended' | 'organization_unsuspended';
  }) {
    return this.auditLogService.record({
      action: input.action,
      entityType: 'organization',
      entityId: input.organizationId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      beforeJson: input.beforeJson,
      afterJson: input.afterJson,
    });
  }

  recordMemberInvited(input: { organizationId: string; inviteId: string; actorUserId: string; actorEmail: string; afterJson: string }) {
    return this.auditLogService.record({
      action: 'member_invited',
      entityType: 'organization_invite',
      entityId: input.inviteId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      afterJson: input.afterJson,
    });
  }

  recordMemberUpdated(input: { organizationId: string; membershipId: string; actorUserId: string; actorEmail: string; beforeJson: string; afterJson: string; action: 'member_removed' | 'member_role_changed' }) {
    return this.auditLogService.record({
      action: input.action,
      entityType: 'organization_membership',
      entityId: input.membershipId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      beforeJson: input.beforeJson,
      afterJson: input.afterJson,
    });
  }

  recordProjectCreated(input: { organizationId: string; projectId: string; actorUserId: string; actorEmail: string; afterJson: string }) {
    return this.auditLogService.record({
      action: 'project_created',
      entityType: 'project',
      entityId: input.projectId,
      organizationId: input.organizationId,
      projectId: input.projectId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      afterJson: input.afterJson,
    });
  }

  recordProjectRoleChanged(input: { organizationId: string; projectId: string; membershipId: string; actorUserId: string; actorEmail: string; beforeJson?: string; afterJson: string }) {
    return this.auditLogService.record({
      action: 'project_role_changed',
      entityType: 'project_membership',
      entityId: input.membershipId,
      organizationId: input.organizationId,
      projectId: input.projectId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      beforeJson: input.beforeJson,
      afterJson: input.afterJson,
    });
  }

  recordProjectArchived(input: {
    organizationId: string;
    projectId: string;
    actorUserId: string;
    actorEmail: string;
    beforeJson: string;
    afterJson: string;
  }) {
    return this.auditLogService.record({
      action: 'project_archived',
      entityType: 'project',
      entityId: input.projectId,
      organizationId: input.organizationId,
      projectId: input.projectId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      beforeJson: input.beforeJson,
      afterJson: input.afterJson,
    });
  }
}
