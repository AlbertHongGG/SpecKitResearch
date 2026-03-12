import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import { AuditService } from '../audit/audit.service.js';
import { auditIssueCommentCreated } from './issues.audit.js';

const createSchema = z.object({ body: z.string().min(1) });

@Controller('projects/:projectId/issues/:issueKey/comments')
export class IssueCommentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(SessionGuard, ProjectMemberGuard)
  async listComments(@Param('projectId') projectId: string, @Param('issueKey') issueKey: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { projectId_issueKey: { projectId, issueKey } },
      select: { id: true },
    });

    if (!issue) {
      throwNotFound();
    }

    const comments = await this.prisma.issueComment.findMany({
      where: { issueId: issue.id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return {
      comments: comments.map((c) => ({
        id: c.id,
        body: c.body,
        authorUserId: c.authorUserId,
        createdAt: c.createdAt.toISOString(),
      })),
      nextCursor: null,
    };
  }

  @Post()
  @RequireProjectRoles('project_manager', 'developer')
  @UseGuards(SessionGuard, ProjectRoleGuard, ReadOnlyGuard)
  async createComment(
    @Param('projectId') projectId: string,
    @Param('issueKey') issueKey: string,
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const issue = await this.prisma.issue.findUnique({
      where: { projectId_issueKey: { projectId, issueKey } },
      include: { project: { select: { organizationId: true } } },
    });

    if (!issue) {
      throwNotFound();
    }

    const comment = await this.prisma.issueComment.create({
      data: {
        issueId: issue.id,
        authorUserId: user!.id,
        body: body.body,
      },
    });

    await auditIssueCommentCreated({
      audit: this.audit,
      actor: { userId: user!.id, email: user!.email },
      scope: { orgId: issue.project.organizationId, projectId },
      comment,
    });

    return { commentId: comment.id };
  }
}
