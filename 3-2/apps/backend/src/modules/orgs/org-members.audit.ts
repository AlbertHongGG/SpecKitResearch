import { AuditActions } from '../audit/audit.actions.js';
import type { AuditService } from '../audit/audit.service.js';

export async function auditOrgMemberRoleUpdated(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  scope: { orgId: string };
  member: { userId: string; orgRole: string };
  before: unknown;
  after: unknown;
}) {
  await params.audit.append({
    action: AuditActions.ORG_MEMBER_ROLE_UPDATED,
    entityType: 'OrganizationMembership',
    entityId: `${params.scope.orgId}:${params.member.userId}`,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.scope.orgId,
    beforeJson: params.before,
    afterJson: params.after,
  });
}

export async function auditOrgMemberRemoved(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  scope: { orgId: string };
  member: { userId: string };
  before: unknown;
}) {
  await params.audit.append({
    action: AuditActions.ORG_MEMBER_REMOVED,
    entityType: 'OrganizationMembership',
    entityId: `${params.scope.orgId}:${params.member.userId}`,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.scope.orgId,
    beforeJson: params.before,
  });
}
