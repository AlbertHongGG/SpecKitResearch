import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type Project, type Workflow, type WorkflowStatus } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';

export interface WorkflowStatusInput {
  key: string;
  name: string;
  position?: number;
}

export interface WorkflowTransitionInput {
  from: string;
  to: string;
}

export interface WorkflowDefinitionInput {
  name: string;
  statuses: WorkflowStatusInput[];
  transitions: WorkflowTransitionInput[];
}

const workflowInclude = {
  statuses: {
    orderBy: {
      position: 'asc',
    },
  },
  transitions: {
    include: {
      fromStatus: true,
      toStatus: true,
    },
  },
} satisfies Prisma.WorkflowInclude;

export type WorkflowRecord = Prisma.WorkflowGetPayload<{ include: typeof workflowInclude }>;
type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class WorkflowsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findProject(projectId: string, executor: PrismaExecutor = this.prisma): Promise<Project | null> {
    return executor.project.findUnique({
      where: { id: projectId },
    });
  }

  findActiveWorkflow(projectId: string, executor: PrismaExecutor = this.prisma): Promise<WorkflowRecord | null> {
    return executor.workflow.findFirst({
      where: {
        projectId,
        isActive: true,
      },
      include: workflowInclude,
    });
  }

  findWorkflowById(workflowId: string, executor: PrismaExecutor = this.prisma): Promise<WorkflowRecord | null> {
    return executor.workflow.findUnique({
      where: { id: workflowId },
      include: workflowInclude,
    });
  }

  async getNextVersion(projectId: string, executor: PrismaExecutor = this.prisma): Promise<number> {
    const latest = await executor.workflow.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return (latest?.version ?? 0) + 1;
  }

  async deactivateActiveWorkflows(projectId: string, executor: PrismaExecutor = this.prisma): Promise<void> {
    await executor.workflow.updateMany({
      where: {
        projectId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  createWorkflow(
    input: { projectId: string; name: string; version: number; createdByUserId: string },
    executor: PrismaExecutor = this.prisma,
  ): Promise<Workflow> {
    return executor.workflow.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        version: input.version,
        isActive: true,
        createdByUserId: input.createdByUserId,
      },
    });
  }

  createStatuses(
    workflowId: string,
    statuses: Array<{ key: string; name: string; position: number }>,
    executor: PrismaExecutor = this.prisma,
  ): Promise<WorkflowStatus[]> {
    return Promise.all(
      statuses.map((status) =>
        executor.workflowStatus.create({
          data: {
            workflowId,
            key: status.key,
            name: status.name,
            position: status.position,
          },
        }),
      ),
    );
  }

  async createTransitions(
    workflowId: string,
    statusesByKey: Map<string, WorkflowStatus>,
    transitions: WorkflowTransitionInput[],
    executor: PrismaExecutor = this.prisma,
  ): Promise<void> {
    if (transitions.length === 0) {
      return;
    }

    await executor.workflowTransition.createMany({
      data: transitions.map((transition) => ({
        workflowId,
        fromStatusId: statusesByKey.get(transition.from)!.id,
        toStatusId: statusesByKey.get(transition.to)!.id,
      })),
    });
  }

  listIssuesForWorkflow(projectId: string, workflowId: string, executor: PrismaExecutor = this.prisma) {
    return executor.issue.findMany({
      where: {
        projectId,
        status: {
          workflowId,
        },
      },
      include: {
        status: true,
      },
    });
  }

  updateIssueStatus(issueId: string, statusId: string, executor: PrismaExecutor = this.prisma) {
    return executor.issue.update({
      where: { id: issueId },
      data: {
        statusId,
        updatedVersion: {
          increment: 1,
        },
      },
    });
  }
}
