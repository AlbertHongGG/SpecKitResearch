import { Body, ConflictException, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { ProjectMemberGuard } from '../../common/guards/project-member.guard.js';
import { ProjectRoleGuard, RequireProjectRoles } from '../../common/guards/project-role.guard.js';
import { ReadOnlyGuard } from '../../common/guards/read-only.guard.js';
import { throwNotFound } from '../../common/rbac/existence-strategy.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuditService } from '../audit/audit.service.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { auditIssueUpdated } from './issues.audit.js';

const patchSchema = z.object({
  expectedVersion: z.string().min(1),
  patch: z.record(z.any()),
});

function toVersionToken(d: Date) {
  return d.toISOString();
}

@Controller('projects/:projectId/issues/:issueKey')
export class IssueDetailController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(SessionGuard, ProjectMemberGuard)
  async getIssueDetail(
    @Param('projectId') projectId: string,
    @Param('issueKey') issueKey: string,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const membership = await this.prisma.projectMembership.findUnique({
      where: { projectId_userId: { projectId, userId: user!.id } },
      select: { projectRole: true },
    });
    if (!membership) {
      // should be unreachable because ProjectMemberGuard ran
      throwNotFound();
    }

    const canMutate = membership.projectRole !== 'viewer';

    const issue = await this.prisma.issue.findUnique({
      where: { projectId_issueKey: { projectId, issueKey } },
      include: { status: true, labels: true },
    });

    if (!issue) {
      throwNotFound();
    }

    return {
      issue: {
        issueKey: issue.issueKey,
        type: issue.type,
        title: issue.title,
        priority: issue.priority,
        statusKey: issue.status.key,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
        description: issue.description,
        labels: issue.labels.map((l) => l.label),
        dueDate: issue.dueDate ? issue.dueDate.toISOString().slice(0, 10) : null,
        estimate: issue.estimate,
        reporterUserId: issue.reporterUserId,
        permissions: {
          canUpdateIssue: canMutate,
          canTransitionIssue: canMutate,
          canComment: canMutate,
        },
      },
    };
  }

  @Patch()
  @RequireProjectRoles('project_manager', 'developer')
  @UseGuards(SessionGuard, ProjectRoleGuard, ReadOnlyGuard)
  async patchIssue(
    @Param('projectId') projectId: string,
    @Param('issueKey') issueKey: string,
    @Body(new ZodValidationPipe(patchSchema)) body: z.infer<typeof patchSchema>,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const issue = await this.prisma.issue.findUnique({
      where: { projectId_issueKey: { projectId, issueKey } },
      include: { status: true, labels: true, project: { select: { organizationId: true } } },
    });

    if (!issue) {
      throwNotFound();
    }

    const currentVersion = toVersionToken(issue.updatedAt);
    if (body.expectedVersion !== currentVersion) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Version conflict' });
    }

    const patch = body.patch as Record<string, unknown>;

    const before = {
      issueKey: issue.issueKey,
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      assigneeUserId: issue.assigneeUserId,
      labels: issue.labels.map((l) => l.label),
      dueDate: issue.dueDate ? issue.dueDate.toISOString().slice(0, 10) : null,
      estimate: issue.estimate,
    };

    const allowedKeys = new Set(['title', 'description', 'priority', 'assigneeUserId', 'labels', 'dueDate', 'estimate']);
    for (const k of Object.keys(patch)) {
      if (!allowedKeys.has(k)) {
        // ignore unknown keys
        delete patch[k];
      }
    }

    const nextLabels = Array.isArray(patch.labels) ? (patch.labels as unknown[]).filter((x) => typeof x === 'string') : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedIssue = await tx.issue.update({
        where: { id: issue.id },
        data: {
          title: typeof patch.title === 'string' ? patch.title : undefined,
          description: patch.description === null || typeof patch.description === 'string' ? (patch.description as any) : undefined,
          priority: typeof patch.priority === 'string' ? (patch.priority as any) : undefined,
          assigneeUserId:
            patch.assigneeUserId === null || typeof patch.assigneeUserId === 'string'
              ? (patch.assigneeUserId as any)
              : undefined,
          dueDate: typeof patch.dueDate === 'string' ? new Date(patch.dueDate) : patch.dueDate === null ? null : undefined,
          estimate: typeof patch.estimate === 'number' ? patch.estimate : patch.estimate === null ? null : undefined,
        },
      });

      if (nextLabels) {
        await tx.issueLabel.deleteMany({ where: { issueId: issue.id } });
        if (nextLabels.length > 0) {
          await tx.issueLabel.createMany({ data: nextLabels.map((label) => ({ issueId: issue.id, label })) });
        }
      }

      return updatedIssue;
    });

    const after = {
      ...before,
      title: typeof patch.title === 'string' ? patch.title : before.title,
      description: patch.description === null || typeof patch.description === 'string' ? (patch.description as any) : before.description,
      priority: typeof patch.priority === 'string' ? patch.priority : before.priority,
      assigneeUserId:
        patch.assigneeUserId === null || typeof patch.assigneeUserId === 'string' ? (patch.assigneeUserId as any) : before.assigneeUserId,
      labels: nextLabels ?? before.labels,
      dueDate: typeof patch.dueDate === 'string' ? patch.dueDate : patch.dueDate === null ? null : before.dueDate,
      estimate: typeof patch.estimate === 'number' ? patch.estimate : patch.estimate === null ? null : before.estimate,
    };

    await auditIssueUpdated({
      audit: this.audit,
      actor: { userId: user!.id, email: user!.email },
      scope: { orgId: issue.project.organizationId, projectId },
      issueId: issue.id,
      before,
      after,
    });

    return { updatedVersion: toVersionToken(updated.updatedAt) };
  }
}
