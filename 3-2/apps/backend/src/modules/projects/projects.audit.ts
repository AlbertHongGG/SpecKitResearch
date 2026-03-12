import type { Project } from '@prisma/client';

import { AuditActions } from '../audit/audit.actions.js';
import type { AuditService } from '../audit/audit.service.js';

export async function auditProjectCreated(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  scope: { orgId: string; projectId: string };
  project: Project;
}) {
  await params.audit.append({
    action: AuditActions.PROJECT_CREATED,
    entityType: 'Project',
    entityId: params.project.id,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.scope.orgId,
    projectId: params.scope.projectId,
    afterJson: {
      key: params.project.key,
      name: params.project.name,
      type: params.project.type,
      status: params.project.status,
    },
  });
}

export async function auditProjectArchived(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  scope: { orgId: string; projectId: string };
  before: unknown;
  after: unknown;
}) {
  await params.audit.append({
    action: AuditActions.PROJECT_ARCHIVED,
    entityType: 'Project',
    entityId: params.scope.projectId,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.scope.orgId,
    projectId: params.scope.projectId,
    beforeJson: params.before,
    afterJson: params.after,
  });
}

export async function auditProjectMemberRoleUpdated(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  scope: { orgId: string; projectId: string };
  member: { userId: string; projectRole: string };
  before: unknown;
  after: unknown;
}) {
  await params.audit.append({
    action: AuditActions.PROJECT_MEMBER_ROLE_UPDATED,
    entityType: 'ProjectMembership',
    entityId: `${params.scope.projectId}:${params.member.userId}`,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.scope.orgId,
    projectId: params.scope.projectId,
    beforeJson: params.before,
    afterJson: params.after,
  });
}

export async function auditProjectMemberRemoved(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  scope: { orgId: string; projectId: string };
  member: { userId: string };
  before: unknown;
}) {
  await params.audit.append({
    action: AuditActions.PROJECT_MEMBER_REMOVED,
    entityType: 'ProjectMembership',
    entityId: `${params.scope.projectId}:${params.member.userId}`,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.scope.orgId,
    projectId: params.scope.projectId,
    beforeJson: params.before,
  });
}
