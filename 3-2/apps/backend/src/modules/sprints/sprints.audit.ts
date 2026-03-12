import type { Sprint } from '@prisma/client';

import { AuditActions } from '../audit/audit.actions.js';
import type { AuditService } from '../audit/audit.service.js';

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function auditSprintCreated(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  scope: { orgId: string; projectId: string };
  sprint: Sprint;
}) {
  await params.audit.append({
    action: AuditActions.SPRINT_CREATED,
    entityType: 'Sprint',
    entityId: params.sprint.id,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.scope.orgId,
    projectId: params.scope.projectId,
    afterJson: {
      sprintId: params.sprint.id,
      name: params.sprint.name,
      status: params.sprint.status,
      goal: params.sprint.goal,
      startDate: params.sprint.startDate ? toDateOnly(params.sprint.startDate) : null,
      endDate: params.sprint.endDate ? toDateOnly(params.sprint.endDate) : null,
    },
  });
}

export async function auditSprintStarted(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  scope: { orgId: string; projectId: string };
  sprintId: string;
  before: unknown;
  after: unknown;
}) {
  await params.audit.append({
    action: AuditActions.SPRINT_STARTED,
    entityType: 'Sprint',
    entityId: params.sprintId,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.scope.orgId,
    projectId: params.scope.projectId,
    beforeJson: params.before,
    afterJson: params.after,
  });
}

export async function auditSprintClosed(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  scope: { orgId: string; projectId: string };
  sprintId: string;
  before: unknown;
  after: unknown;
}) {
  await params.audit.append({
    action: AuditActions.SPRINT_CLOSED,
    entityType: 'Sprint',
    entityId: params.sprintId,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.scope.orgId,
    projectId: params.scope.projectId,
    beforeJson: params.before,
    afterJson: params.after,
  });
}
