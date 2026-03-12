import { Inject, Injectable } from '@nestjs/common';

import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { AuditLogService } from '../audit/audit-log.service';
import { IssuesRepository } from './issues.repository';
import { IssuesService } from './issues.service';

@Injectable()
export class IssueTimelineService {
  constructor(
    @Inject(IssuesRepository) private readonly issuesRepository: IssuesRepository,
    @Inject(IssuesService) private readonly issuesService: IssuesService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  async getTimeline(projectId: string, issueKey: string) {
    const issue = await this.issuesRepository.findIssueByKey(projectId, issueKey);
    if (!issue) {
      throw resourceHidden('Issue');
    }

    const auditEntries = await this.auditLogService.listRecent({ projectId, limit: 200 });
    const relevantEntries = auditEntries
      .filter((entry) => this.belongsToIssue(entry, issue.id))
      .map((entry) => ({
        kind: entry.entityType === 'issue_comment' ? 'comment' : 'audit',
        id: entry.id,
        createdAt: entry.createdAt.toISOString(),
        action: entry.action,
        actorEmail: entry.actorEmail,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeJson: entry.beforeJson,
        afterJson: entry.afterJson,
      }))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    return {
      issue: this.issuesService.serializeIssue(issue),
      timeline: relevantEntries,
    };
  }

  private belongsToIssue(
    entry: { entityId: string; beforeJson: string | null; afterJson: string | null },
    issueId: string,
  ) {
    if (entry.entityId === issueId) {
      return true;
    }

    const payloads = [entry.beforeJson, entry.afterJson]
      .filter((candidate): candidate is string => Boolean(candidate))
      .map((candidate) => {
        try {
          return JSON.parse(candidate) as Record<string, unknown>;
        } catch {
          return {};
        }
      });

    return payloads.some((payload) => payload.issueId === issueId || payload.id === issueId);
  }
}
