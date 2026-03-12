import { ConflictException, Inject, Injectable } from '@nestjs/common';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { IssuesAuditService } from './issues.audit';
import { IssuesRepository } from './issues.repository';
import { WorkflowStatusService } from '../workflows/workflow-status.service';
import { WorkflowsRepository } from '../workflows/workflows.repository';

@Injectable()
export class IssueTransitionService {
  constructor(
    @Inject(IssuesRepository) private readonly issuesRepository: IssuesRepository,
    @Inject(WorkflowsRepository) private readonly workflowsRepository: WorkflowsRepository,
    @Inject(WorkflowStatusService) private readonly workflowStatusService: WorkflowStatusService,
    @Inject(IssuesAuditService) private readonly issuesAuditService: IssuesAuditService,
  ) {}

  async transitionIssue(
    projectId: string,
    issueKey: string,
    input: { toStatusKey?: string; expectedVersion?: number },
    actor: { userId: string; email: string },
  ) {
    const issue = await this.issuesRepository.findIssueByKey(projectId, issueKey);
    if (!issue) {
      throw resourceHidden('Issue');
    }

    if (input.expectedVersion !== undefined && input.expectedVersion !== issue.updatedVersion) {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: 'Issue version is stale. Refresh and try again.',
      });
    }

    const activeWorkflow = await this.workflowsRepository.findActiveWorkflow(projectId);
    if (!activeWorkflow) {
      throw new ConflictException({
        code: ERROR_CODES.WORKFLOW_INVALID,
        message: 'Project does not have an active workflow.',
      });
    }

    if (issue.status.workflowId !== activeWorkflow.id) {
      throw new ConflictException({
        code: ERROR_CODES.ISSUE_STATUS_DEPRECATED,
        message: 'Issue is in a deprecated workflow status and cannot transition until remapped.',
      });
    }

    const targetStatusKey = input.toStatusKey?.trim().toLowerCase() ?? '';
    const targetStatus = activeWorkflow.statuses.find((status) => status.key === targetStatusKey);
    if (!targetStatus) {
      throw new ConflictException({
        code: ERROR_CODES.ISSUE_TRANSITION_INVALID,
        message: 'Target workflow status does not exist in the active workflow.',
      });
    }

    const transitions = activeWorkflow.transitions.map((transition) => ({
      from: transition.fromStatus.key,
      to: transition.toStatus.key,
    }));
    if (!this.workflowStatusService.canTransition(issue.status.key, targetStatus.key, transitions)) {
      throw new ConflictException({
        code: ERROR_CODES.ISSUE_TRANSITION_INVALID,
        message: 'The requested status transition is not allowed.',
      });
    }

    const beforeJson = JSON.stringify({
      issueKey: issue.issueKey,
      statusKey: issue.status.key,
      updatedVersion: issue.updatedVersion,
    });

    await this.issuesRepository.updateIssue(issue.id, {
      status: {
        connect: {
          id: targetStatus.id,
        },
      },
      updatedVersion: {
        increment: 1,
      },
    });

    const updatedIssue = await this.issuesRepository.findIssueByKey(projectId, issueKey);
    if (!updatedIssue) {
      throw resourceHidden('Issue');
    }

    await this.issuesAuditService.recordIssueTransition({
      issueId: updatedIssue.id,
      projectId,
      organizationId: updatedIssue.project.organizationId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      beforeJson,
      afterJson: JSON.stringify({
        issueKey: updatedIssue.issueKey,
        statusKey: updatedIssue.status.key,
        updatedVersion: updatedIssue.updatedVersion,
      }),
    });

    return updatedIssue;
  }
}
