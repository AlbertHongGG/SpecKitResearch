import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { ProjectMemberGuard } from '../../common/guards/project-member.guard.js';
import { ProjectOrgAdminGuard } from '../../common/guards/project-org-admin.guard.js';
import { ReadOnlyGuard } from '../../common/guards/read-only.guard.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { throwNotFound } from '../../common/rbac/existence-strategy.js';
import { AuditService } from '../audit/audit.service.js';
import { auditProjectArchived } from './projects.audit.js';

@Controller('projects/:projectId/settings')
export class ProjectSettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(SessionGuard, ProjectMemberGuard)
  async getSettings(@Param('projectId') projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true, status: true },
    });

    if (!project) {
      throwNotFound();
    }

    return { project };
  }

  @Post('archive')
  @UseGuards(SessionGuard, ProjectOrgAdminGuard, ReadOnlyGuard)
  async archive(
    @Param('projectId') projectId: string,
    @CurrentUser() actor: RequestWithUser['user'],
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true, status: true },
    });

    if (!project) {
      throwNotFound();
    }

    const before = { status: project.status };

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'archived' },
      select: { status: true },
    });

    const after = { status: updated.status };

    await auditProjectArchived({
      audit: this.audit,
      actor: { userId: actor!.id, email: actor!.email },
      scope: { orgId: project.organizationId, projectId },
      before,
      after,
    });

    return { ok: true };
  }
}
