import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { PrismaService } from '../../common/prisma/prisma.service';
import { sanitizePlainText, sanitizeRichText } from '../../common/security/content-sanitizer';
import { IssueEpicLinksService } from './issue-epic-links.service';
import { IssueKeyGeneratorService } from './issue-key-generator.service';
import { IssueLabelsRepository } from './issue-labels.repository';
import { IssuesAuditService } from './issues.audit';
import { IssuesRepository, type IssueRecord } from './issues.repository';
import { WorkflowsRepository } from '../workflows/workflows.repository';

@Injectable()
export class IssuesService {
  constructor(
    @Inject(IssuesRepository) private readonly issuesRepository: IssuesRepository,
    @Inject(WorkflowsRepository) private readonly workflowsRepository: WorkflowsRepository,
    @Inject(IssueLabelsRepository) private readonly issueLabelsRepository: IssueLabelsRepository,
    @Inject(IssueEpicLinksService) private readonly issueEpicLinksService: IssueEpicLinksService,
    @Inject(IssueKeyGeneratorService) private readonly issueKeyGeneratorService: IssueKeyGeneratorService,
    @Inject(IssuesAuditService) private readonly issuesAuditService: IssuesAuditService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async listIssues(projectId: string, sort: 'created_at' | 'updated_at' = 'updated_at') {
    const project = await this.issuesRepository.findProject(projectId);
    if (!project) {
      throw resourceHidden('Project');
    }

    const issues = await this.issuesRepository.listIssues(projectId, sort);
    return issues.map((issue) => this.serializeIssue(issue));
  }

  async getIssue(projectId: string, issueKey: string) {
    const issue = await this.issuesRepository.findIssueByKey(projectId, issueKey);
    if (!issue) {
      throw resourceHidden('Issue');
    }

    return this.serializeIssue(issue);
  }

  async createIssue(
    projectId: string,
    input: {
      type?: 'story' | 'task' | 'bug' | 'epic';
      title?: string;
      description?: string | null;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      statusKey?: string;
      assigneeUserId?: string | null;
      dueDate?: string | null;
      estimate?: number | null;
      sprintId?: string | null;
      labels?: string[];
      epicIssueKey?: string | null;
    },
    actor: { userId: string; email: string },
  ) {
    const project = await this.issuesRepository.findProject(projectId);
    if (!project) {
      throw resourceHidden('Project');
    }

    const title = input.title ? sanitizePlainText(input.title) : '';
    if (!title) {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: 'Issue title is required.',
      });
    }

    const activeWorkflow = await this.workflowsRepository.findActiveWorkflow(projectId);
    if (!activeWorkflow) {
      throw new ConflictException({
        code: ERROR_CODES.WORKFLOW_INVALID,
        message: 'Project does not have an active workflow.',
      });
    }

    const defaultStatus = input.statusKey
      ? activeWorkflow.statuses.find((status) => status.key === input.statusKey)
      : activeWorkflow.statuses[0];
    if (!defaultStatus) {
      throw new ConflictException({
        code: ERROR_CODES.WORKFLOW_INVALID,
        message: 'Issue status is not valid for the active workflow.',
      });
    }

    const issue = await this.prisma.$transaction(async (transaction) => {
      const sprintId = input.sprintId ? await this.validateSprint(projectId, input.sprintId, transaction) : null;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const issueKey = await this.issueKeyGeneratorService.generateNextIssueKey(projectId, project.key, transaction);

        try {
          const created = await this.issuesRepository.createIssue(
            {
              projectId,
              issueKey,
              type: input.type ?? 'task',
              title,
              description: sanitizeRichText(input.description),
              priority: input.priority ?? 'medium',
              statusId: defaultStatus.id,
              reporterUserId: actor.userId,
              assigneeUserId: input.assigneeUserId ?? null,
              dueDate: input.dueDate ? new Date(input.dueDate) : null,
              estimate: input.estimate ?? null,
              sprintId,
            },
            transaction,
          );

          await this.issueLabelsRepository.replaceLabels(created.id, input.labels ?? [], transaction);
          await this.issueEpicLinksService.replaceEpicLink(projectId, created, input.epicIssueKey ?? null, transaction);

          const hydrated = await this.issuesRepository.findIssueById(created.id, transaction);
          if (!hydrated) {
            throw resourceHidden('Issue');
          }

          return hydrated;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            continue;
          }

          throw error;
        }
      }

      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: 'Issue key could not be reserved. Try again.',
      });
    });

    await this.issuesAuditService.recordIssueCreated({
      issueId: issue.id,
      projectId,
      organizationId: issue.project.organizationId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      afterJson: JSON.stringify(this.serializeIssue(issue)),
    });

    return this.serializeIssue(issue);
  }

  async updateIssue(
    projectId: string,
    issueKey: string,
    input: {
      expectedVersion?: number;
      title?: string;
      description?: string | null;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      assigneeUserId?: string | null;
      dueDate?: string | null;
      estimate?: number | null;
      sprintId?: string | null;
      labels?: string[];
      epicIssueKey?: string | null;
    },
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

    const beforeJson = JSON.stringify(this.serializeIssue(issue));

    const updatedIssue = await this.prisma.$transaction(async (transaction) => {
      const data: Prisma.IssueUpdateInput = {
        updatedVersion: {
          increment: 1,
        },
      };

      if (input.title !== undefined) {
        data.title = sanitizePlainText(input.title);
      }
      if (input.description !== undefined) {
        data.description = sanitizeRichText(input.description);
      }
      if (input.priority !== undefined) {
        data.priority = input.priority;
      }
      if (input.assigneeUserId !== undefined) {
        data.assigneeUserId = input.assigneeUserId;
      }
      if (input.dueDate !== undefined) {
        data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
      }
      if (input.estimate !== undefined) {
        data.estimate = input.estimate;
      }
      if (input.sprintId !== undefined) {
        data.sprint = input.sprintId
          ? {
              connect: {
                id: await this.validateSprint(projectId, input.sprintId, transaction),
              },
            }
          : {
              disconnect: true,
            };
      }

      await this.issuesRepository.updateIssue(issue.id, data, transaction);

      if (input.labels !== undefined) {
        await this.issueLabelsRepository.replaceLabels(issue.id, input.labels, transaction);
      }

      if (input.epicIssueKey !== undefined) {
        await this.issueEpicLinksService.replaceEpicLink(projectId, issue, input.epicIssueKey, transaction);
      }

      const hydrated = await this.issuesRepository.findIssueById(issue.id, transaction);
      if (!hydrated) {
        throw resourceHidden('Issue');
      }

      return hydrated;
    });

    await this.issuesAuditService.recordIssueUpdated({
      issueId: updatedIssue.id,
      projectId,
      organizationId: updatedIssue.project.organizationId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      beforeJson,
      afterJson: JSON.stringify(this.serializeIssue(updatedIssue)),
    });

    return this.serializeIssue(updatedIssue);
  }

  private async validateSprint(projectId: string, sprintId: string, transaction: Prisma.TransactionClient): Promise<string> {
    const sprint = await this.issuesRepository.findSprint(projectId, sprintId, transaction);
    if (!sprint) {
      throw new ConflictException({
        code: ERROR_CODES.SPRINT_INVALID,
        message: 'Sprint does not belong to this project.',
      });
    }

    return sprint.id;
  }

  serializeIssue(issue: IssueRecord) {
    return {
      id: issue.id,
      projectId: issue.projectId,
      project: {
        id: issue.project.id,
        key: issue.project.key,
        name: issue.project.name,
        status: issue.project.status,
        organizationStatus: issue.project.organization.status,
      },
      issueKey: issue.issueKey,
      type: issue.type,
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      status: {
        id: issue.status.id,
        key: issue.status.key,
        name: issue.status.name,
        workflowVersion: issue.status.workflow.version,
        isDeprecated: !issue.status.workflow.isActive,
      },
      reporterUserId: issue.reporterUserId,
      assigneeUserId: issue.assigneeUserId,
      dueDate: issue.dueDate?.toISOString() ?? null,
      estimate: issue.estimate,
      sprint: issue.sprint
        ? {
            id: issue.sprint.id,
            name: issue.sprint.name,
            status: issue.sprint.status,
          }
        : null,
      labels: issue.labels.map((label) => label.label),
      epicIssueKey: issue.parentEpicLinks[0]?.epicIssue.issueKey ?? null,
      comments: issue.comments.map((comment) => ({
        id: comment.id,
        authorUserId: comment.authorUserId,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
      })),
      updatedVersion: issue.updatedVersion,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    };
  }
}
