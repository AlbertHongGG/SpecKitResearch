import type { Issue, IssueComment } from '@prisma/client';

import { AuditActions } from '../audit/audit.actions.js';
import type { AuditService } from '../audit/audit.service.js';

export async function auditIssueCreated(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  scope: { orgId: string; projectId: string };
  issue: Issue;
}) {
  await params.audit.append({
    action: AuditActions.ISSUE_CREATED,
    entityType: 'Issue',
    entityId: params.issue.id,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.scope.orgId,
    projectId: params.scope.projectId,
    afterJson: {
      issueKey: params.issue.issueKey,
      type: params.issue.type,
      title: params.issue.title,
      statusId: params.issue.statusId,
    },
  });
}

export async function auditIssueUpdated(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  scope: { orgId: string; projectId: string };
  issueId: string;
  before: unknown;
  after: unknown;
}) {
  await params.audit.append({
    action: AuditActions.ISSUE_UPDATED,
    entityType: 'Issue',
    entityId: params.issueId,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.scope.orgId,
    projectId: params.scope.projectId,
    beforeJson: params.before,
    afterJson: params.after,
  });
}

export async function auditIssueTransitioned(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  scope: { orgId: string; projectId: string };
  issueId: string;
  before: unknown;
  after: unknown;
}) {
  await params.audit.append({
    action: AuditActions.ISSUE_TRANSITIONED,
    entityType: 'Issue',
    entityId: params.issueId,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.scope.orgId,
    projectId: params.scope.projectId,
    beforeJson: params.before,
    afterJson: params.after,
  });
}

export async function auditIssueCommentCreated(params: {
  audit: AuditService;
  actor: { userId: string; email: string };
  scope: { orgId: string; projectId: string };
  comment: IssueComment;
}) {
  await params.audit.append({
    action: AuditActions.ISSUE_COMMENT_CREATED,
    entityType: 'IssueComment',
    entityId: params.comment.id,
    actorUserId: params.actor.userId,
    actorEmail: params.actor.email,
    organizationId: params.scope.orgId,
    projectId: params.scope.projectId,
    afterJson: {
      issueId: params.comment.issueId,
      body: params.comment.body,
      createdAt: params.comment.createdAt,
    },
  });
}
