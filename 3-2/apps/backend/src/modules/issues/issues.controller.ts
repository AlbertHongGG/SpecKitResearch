import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { ProjectMemberGuard } from '../../common/guards/project-member.guard.js';
import { ProjectRoleGuard, RequireProjectRoles } from '../../common/guards/project-role.guard.js';
import { ReadOnlyGuard } from '../../common/guards/read-only.guard.js';
import { throwNotFound } from '../../common/rbac/existence-strategy.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { IssueKeyService } from './issue-key.service.js';
import { WorkflowsService } from '../workflows/workflows.service.js';
import { AuditService } from '../audit/audit.service.js';
import { auditIssueCreated } from './issues.audit.js';

@Controller('projects/:projectId/issues')
export class IssuesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly issueKeys: IssueKeyService,
    private readonly workflows: WorkflowsService,
    private readonly audit: AuditService,
  ) {}

  private normalizeLimit(limit: unknown) {
    const n = typeof limit === 'string' ? Number(limit) : typeof limit === 'number' ? limit : 50;
    if (!Number.isFinite(n) || n <= 0) return 50;
    return Math.min(50, Math.floor(n));
  }

  private sortOrder(sort: unknown): 'createdAt' | 'updatedAt' {
    return sort === 'updated_at' ? 'updatedAt' : 'createdAt';
  }

  @Get()
  @UseGuards(SessionGuard, ProjectMemberGuard)
  async listIssues(
    @Param('projectId') projectId: string,
    @Query('sort') sort: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const take = this.normalizeLimit(limit);
    const orderBy = this.sortOrder(sort);

    const membership = await this.prisma.projectMembership.findUnique({
      where: { projectId_userId: { projectId, userId: user!.id } },
      select: { projectRole: true },
    });
    if (!membership) {
      // should be unreachable because ProjectMemberGuard ran
      throwNotFound();
    }

    const canMutate = membership.projectRole !== 'viewer';

    const issues = await this.prisma.issue.findMany({
      where: { projectId },
      include: { status: true },
      orderBy: [{ [orderBy]: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    const nextCursor = issues.length > take ? issues[issues.length - 1]!.id : null;
    const page = issues.slice(0, take);

    return {
      issues: page.map((i) => ({
        issueKey: i.issueKey,
        type: i.type,
        title: i.title,
        priority: i.priority,
        statusKey: i.status.key,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
      nextCursor,
      permissions: {
        canCreateIssue: canMutate,
      },
    };
  }

  @Post()
  @RequireProjectRoles('project_manager', 'developer')
  @UseGuards(SessionGuard, ProjectRoleGuard, ReadOnlyGuard)
  async createIssue(
    @Param('projectId') projectId: string,
    @Body(
      new ZodValidationPipe(
        z.object({
          type: z.enum(['story', 'task', 'bug', 'epic']),
          title: z.string().min(1),
          description: z.string().nullable().optional(),
          priority: z.enum(['low', 'medium', 'high', 'critical']),
          assigneeUserId: z.string().nullable().optional(),
          labels: z.array(z.string()).optional(),
          dueDate: z.string().nullable().optional(),
          estimate: z.number().nullable().optional(),
        }),
      )
    )
    body: {
      type: 'story' | 'task' | 'bug' | 'epic';
      title: string;
      description?: string | null;
      priority: 'low' | 'medium' | 'high' | 'critical';
      assigneeUserId?: string | null;
      labels?: string[];
      dueDate?: string | null;
      estimate?: number | null;
    },
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    });

    if (!project) {
      throwNotFound();
    }

    const wf = await this.workflows.getActiveWorkflow(projectId);
    const defaultStatus = wf.statuses.slice().sort((a, b) => a.position - b.position)[0];
    if (!defaultStatus) {
      throwNotFound();
    }

    const issueKey = await this.issueKeys.allocateIssueKey(projectId);

    const issue = await this.prisma.issue.create({
      data: {
        projectId,
        issueKey,
        type: body.type,
        title: body.title,
        description: body.description ?? null,
        priority: body.priority,
        statusId: defaultStatus.id,
        reporterUserId: user!.id,
        assigneeUserId: body.assigneeUserId ?? null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        estimate: body.estimate ?? null,
        labels: body.labels?.length ? { create: body.labels.map((label) => ({ label })) } : undefined,
      },
    });

    await auditIssueCreated({
      audit: this.audit,
      actor: { userId: user!.id, email: user!.email },
      scope: { orgId: project.organizationId, projectId },
      issue,
    });

    return { issueKey };
  }
}
