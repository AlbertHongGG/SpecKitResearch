import { Body, ConflictException, Controller, ForbiddenException, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { ProjectRoleGuard, RequireProjectRoles } from '../../common/guards/project-role.guard.js';
import { ReadOnlyGuard } from '../../common/guards/read-only.guard.js';
import { throwNotFound } from '../../common/rbac/existence-strategy.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { WorkflowsService } from '../workflows/workflows.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { auditIssueTransitioned } from './issues.audit.js';

const transitionSchema = z.object({
  toStatusKey: z.string().min(1),
  expectedVersion: z.string().min(1),
});

function toVersionToken(d: Date) {
  return d.toISOString();
}

@Controller('projects/:projectId/issues/:issueKey/transition')
export class IssueTransitionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflows: WorkflowsService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @RequireProjectRoles('project_manager', 'developer')
  @UseGuards(SessionGuard, ProjectRoleGuard, ReadOnlyGuard)
  async transitionIssue(
    @Param('projectId') projectId: string,
    @Param('issueKey') issueKey: string,
    @Body(new ZodValidationPipe(transitionSchema)) body: z.infer<typeof transitionSchema>,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const issue = await this.prisma.issue.findUnique({
      where: { projectId_issueKey: { projectId, issueKey } },
      include: { status: true, project: { select: { organizationId: true } } },
    });

    if (!issue) {
      throwNotFound();
    }

    const currentVersion = toVersionToken(issue.updatedAt);
    if (body.expectedVersion !== currentVersion) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Version conflict' });
    }

    const wf = await this.workflows.getActiveWorkflow(projectId);

    if (issue.status.workflowId !== wf.id) {
      throw new ForbiddenException({
        code: ErrorCodes.ISSUE_STATUS_DEPRECATED,
        message: 'Issue status is deprecated',
      });
    }

    const toStatus = wf.statuses.find((s) => s.key === body.toStatusKey);
    if (!toStatus) {
      throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Invalid status' });
    }

    const allowed = await this.workflows.isTransitionAllowed({
      workflowId: wf.id,
      fromStatusId: issue.statusId,
      toStatusId: toStatus.id,
    });

    if (!allowed) {
      throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Transition not allowed' });
    }

    const before = { issueKey: issue.issueKey, statusKey: issue.status.key };

    const updated = await this.prisma.issue.update({
      where: { id: issue.id },
      data: { statusId: toStatus.id },
      include: { status: true },
    });

    const after = { issueKey: updated.issueKey, statusKey: updated.status.key };

    await auditIssueTransitioned({
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
