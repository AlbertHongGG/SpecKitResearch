import { Inject, Injectable } from '@nestjs/common';

import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class IssuesAuditService {
  constructor(@Inject(AuditLogService) private readonly auditLogService: AuditLogService) {}

  recordIssueCreated(input: {
    issueId: string;
    projectId: string;
    organizationId: string;
    actorUserId: string;
    actorEmail: string;
    afterJson: string;
  }) {
    return this.auditLogService.record({
      action: 'issue_created',
      entityType: 'issue',
      entityId: input.issueId,
      projectId: input.projectId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      afterJson: input.afterJson,
    });
  }

  recordIssueUpdated(input: {
    issueId: string;
    projectId: string;
    organizationId: string;
    actorUserId: string;
    actorEmail: string;
    beforeJson: string;
    afterJson: string;
  }) {
    return this.auditLogService.record({
      action: 'issue_updated',
      entityType: 'issue',
      entityId: input.issueId,
      projectId: input.projectId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      beforeJson: input.beforeJson,
      afterJson: input.afterJson,
    });
  }

  recordIssueTransition(input: {
    issueId: string;
    projectId: string;
    organizationId: string;
    actorUserId: string;
    actorEmail: string;
    beforeJson: string;
    afterJson: string;
  }) {
    return this.auditLogService.record({
      action: 'issue_status_transition',
      entityType: 'issue',
      entityId: input.issueId,
      projectId: input.projectId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      beforeJson: input.beforeJson,
      afterJson: input.afterJson,
    });
  }

  recordCommentCreated(input: {
    issueId: string;
    commentId: string;
    projectId: string;
    organizationId: string;
    actorUserId: string;
    actorEmail: string;
    afterJson: string;
  }) {
    return this.auditLogService.record({
      action: 'comment_created',
      entityType: 'issue_comment',
      entityId: input.commentId,
      projectId: input.projectId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      afterJson: input.afterJson,
    });
  }

  recordEpicLinkUpdated(input: {
    issueId: string;
    projectId: string;
    organizationId: string;
    actorUserId: string;
    actorEmail: string;
    beforeJson?: string;
    afterJson?: string;
  }) {
    return this.auditLogService.record({
      action: 'epic_link_added',
      entityType: 'issue_epic_link',
      entityId: input.issueId,
      projectId: input.projectId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      beforeJson: input.beforeJson,
      afterJson: input.afterJson,
    });
  }
}
