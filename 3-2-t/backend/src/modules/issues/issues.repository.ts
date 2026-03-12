import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type Project, type Sprint } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';

const issueInclude = {
  project: {
    include: {
      organization: true,
    },
  },
  status: {
    include: {
      workflow: true,
    },
  },
  sprint: true,
  labels: {
    orderBy: {
      label: 'asc',
    },
  },
  comments: {
    orderBy: {
      createdAt: 'asc',
    },
  },
  parentEpicLinks: {
    include: {
      epicIssue: true,
    },
  },
} satisfies Prisma.IssueInclude;

export type IssueRecord = Prisma.IssueGetPayload<{ include: typeof issueInclude }>;
type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class IssuesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findProject(projectId: string, executor: PrismaExecutor = this.prisma): Promise<Project | null> {
    return executor.project.findUnique({
      where: { id: projectId },
    });
  }

  findSprint(projectId: string, sprintId: string, executor: PrismaExecutor = this.prisma): Promise<Sprint | null> {
    return executor.sprint.findFirst({
      where: {
        id: sprintId,
        projectId,
      },
    });
  }

  listIssues(projectId: string, sort: 'created_at' | 'updated_at' = 'updated_at', executor: PrismaExecutor = this.prisma): Promise<IssueRecord[]> {
    return executor.issue.findMany({
      where: { projectId },
      include: issueInclude,
      orderBy: sort === 'created_at' ? { createdAt: 'desc' } : { updatedAt: 'desc' },
    });
  }

  findIssueByKey(projectId: string, issueKey: string, executor: PrismaExecutor = this.prisma): Promise<IssueRecord | null> {
    return executor.issue.findUnique({
      where: {
        projectId_issueKey: {
          projectId,
          issueKey,
        },
      },
      include: issueInclude,
    });
  }

  findIssueById(issueId: string, executor: PrismaExecutor = this.prisma): Promise<IssueRecord | null> {
    return executor.issue.findUnique({
      where: { id: issueId },
      include: issueInclude,
    });
  }

  createIssue(
    input: {
      projectId: string;
      issueKey: string;
      type: 'story' | 'task' | 'bug' | 'epic';
      title: string;
      description?: string | null;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      statusId: string;
      reporterUserId: string;
      assigneeUserId?: string | null;
      dueDate?: Date | null;
      estimate?: number | null;
      sprintId?: string | null;
    },
    executor: PrismaExecutor = this.prisma,
  ) {
    return executor.issue.create({
      data: {
        projectId: input.projectId,
        issueKey: input.issueKey,
        type: input.type,
        title: input.title,
        description: input.description,
        priority: input.priority ?? 'medium',
        statusId: input.statusId,
        reporterUserId: input.reporterUserId,
        assigneeUserId: input.assigneeUserId,
        dueDate: input.dueDate,
        estimate: input.estimate,
        sprintId: input.sprintId,
      },
    });
  }

  updateIssue(
    issueId: string,
    data: Prisma.IssueUpdateInput,
    executor: PrismaExecutor = this.prisma,
  ) {
    return executor.issue.update({
      where: { id: issueId },
      data,
    });
  }

  listIssuesBySprint(projectId: string, sprintId: string | null, executor: PrismaExecutor = this.prisma): Promise<IssueRecord[]> {
    return executor.issue.findMany({
      where: {
        projectId,
        sprintId,
      },
      include: issueInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }
}
