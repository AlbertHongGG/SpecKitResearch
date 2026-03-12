import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { WorkflowStatusService } from './workflow-status.service';
import { WorkflowsRepository, type WorkflowDefinitionInput } from './workflows.repository';

@Injectable()
export class WorkflowsService {
  constructor(
    @Inject(WorkflowsRepository) private readonly workflowsRepository: WorkflowsRepository,
    @Inject(WorkflowStatusService) private readonly workflowStatusService: WorkflowStatusService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  async getActiveWorkflow(projectId: string) {
    const workflow = await this.workflowsRepository.findActiveWorkflow(projectId);
    if (!workflow) {
      throw resourceHidden('Workflow');
    }

    return this.serializeWorkflow(workflow);
  }

  async updateWorkflow(projectId: string, actor: { userId: string; email: string }, input: WorkflowDefinitionInput) {
    const project = await this.workflowsRepository.findProject(projectId);
    if (!project) {
      throw resourceHidden('Project');
    }

    const normalized = this.workflowStatusService.validateDefinition(input);
    const currentWorkflow = await this.workflowsRepository.findActiveWorkflow(projectId);

    const nextWorkflowId = await this.prisma.$transaction(async (transaction) => {
      await this.workflowsRepository.deactivateActiveWorkflows(projectId, transaction);

      const version = await this.workflowsRepository.getNextVersion(projectId, transaction);
      const workflow = await this.workflowsRepository.createWorkflow(
        {
          projectId,
          name: normalized.name,
          version,
          createdByUserId: actor.userId,
        },
        transaction,
      );

      const statuses = await this.workflowsRepository.createStatuses(workflow.id, normalized.statuses, transaction);
      const statusesByKey = new Map(statuses.map((status) => [status.key, status]));
      await this.workflowsRepository.createTransitions(workflow.id, statusesByKey, normalized.transitions, transaction);

      if (currentWorkflow) {
        const issues = await this.workflowsRepository.listIssuesForWorkflow(projectId, currentWorkflow.id, transaction);
        for (const issue of issues) {
          const mappedStatus = statusesByKey.get(issue.status.key);
          if (mappedStatus) {
            await this.workflowsRepository.updateIssueStatus(issue.id, mappedStatus.id, transaction);
          }
        }
      }

      return workflow.id;
    });

    const nextWorkflow = await this.workflowsRepository.findWorkflowById(nextWorkflowId);
    if (!nextWorkflow) {
      throw new ConflictException({
        code: ERROR_CODES.WORKFLOW_INVALID,
        message: 'Workflow update could not be completed.',
      });
    }

    await this.auditLogService.record({
      action: 'workflow_updated',
      entityType: 'workflow',
      entityId: nextWorkflow.id,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      projectId,
      organizationId: project.organizationId,
      beforeJson: currentWorkflow ? JSON.stringify(this.serializeWorkflow(currentWorkflow)) : undefined,
      afterJson: JSON.stringify(this.serializeWorkflow(nextWorkflow)),
    });

    return this.serializeWorkflow(nextWorkflow);
  }

  private serializeWorkflow(workflow: Awaited<ReturnType<WorkflowsRepository['findActiveWorkflow']>> extends infer T ? Exclude<T, null> : never) {
    return {
      id: workflow.id,
      name: workflow.name,
      version: workflow.version,
      isActive: workflow.isActive,
      statuses: workflow.statuses.map((status) => ({
        id: status.id,
        key: status.key,
        name: status.name,
        position: status.position,
      })),
      transitions: workflow.transitions.map((transition) => ({
        from: transition.fromStatus.key,
        to: transition.toStatus.key,
      })),
    };
  }
}
