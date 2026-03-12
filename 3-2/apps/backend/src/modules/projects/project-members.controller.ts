import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { ProjectOrgAdminGuard } from '../../common/guards/project-org-admin.guard.js';
import { ReadOnlyGuard } from '../../common/guards/read-only.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { throwNotFound } from '../../common/rbac/existence-strategy.js';
import { AuditService } from '../audit/audit.service.js';
import { auditProjectMemberRemoved, auditProjectMemberRoleUpdated } from './projects.audit.js';

const upsertSchema = z.object({
  userId: z.string().min(1),
  projectRole: z.enum(['project_manager', 'developer', 'viewer']),
});

const patchSchema = z.object({
  projectRole: z.enum(['project_manager', 'developer', 'viewer']),
});

@Controller('projects/:projectId/members')
export class ProjectMembersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @UseGuards(SessionGuard, ProjectOrgAdminGuard, ReadOnlyGuard)
  async assign(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(upsertSchema)) body: z.infer<typeof upsertSchema>,
    @CurrentUser() actor: RequestWithUser['user'],
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    });
    if (!project) {
      throwNotFound();
    }

    const targetOrgMembership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: project.organizationId, userId: body.userId } },
      select: { status: true },
    });
    if (!targetOrgMembership || targetOrgMembership.status !== 'active') {
      throwNotFound();
    }

    const existing = await this.prisma.projectMembership.findUnique({
      where: { projectId_userId: { projectId, userId: body.userId } },
      select: { userId: true, projectRole: true },
    });

    const before = existing ? { ...existing } : null;

    const updated = await this.prisma.projectMembership.upsert({
      where: { projectId_userId: { projectId, userId: body.userId } },
      update: { projectRole: body.projectRole },
      create: { projectId, userId: body.userId, projectRole: body.projectRole },
      select: { userId: true, projectRole: true },
    });

    await auditProjectMemberRoleUpdated({
      audit: this.audit,
      actor: { userId: actor!.id, email: actor!.email },
      scope: { orgId: project.organizationId, projectId },
      member: { userId: updated.userId, projectRole: updated.projectRole },
      before: before ?? { userId: body.userId, projectRole: null },
      after: { ...updated },
    });

    return { ok: true };
  }

  @Patch(':userId')
  @UseGuards(SessionGuard, ProjectOrgAdminGuard, ReadOnlyGuard)
  async update(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(patchSchema)) body: z.infer<typeof patchSchema>,
    @CurrentUser() actor: RequestWithUser['user'],
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    });
    if (!project) {
      throwNotFound();
    }

    const existing = await this.prisma.projectMembership.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { userId: true, projectRole: true },
    });
    if (!existing) {
      throwNotFound();
    }

    const before = { ...existing };

    const updated = await this.prisma.projectMembership.update({
      where: { projectId_userId: { projectId, userId } },
      data: { projectRole: body.projectRole },
      select: { userId: true, projectRole: true },
    });

    await auditProjectMemberRoleUpdated({
      audit: this.audit,
      actor: { userId: actor!.id, email: actor!.email },
      scope: { orgId: project.organizationId, projectId },
      member: { userId: updated.userId, projectRole: updated.projectRole },
      before,
      after: { ...updated },
    });

    return { ok: true };
  }

  @Delete(':userId')
  @UseGuards(SessionGuard, ProjectOrgAdminGuard, ReadOnlyGuard)
  async remove(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @CurrentUser() actor: RequestWithUser['user'],
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    });
    if (!project) {
      throwNotFound();
    }

    const existing = await this.prisma.projectMembership.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { userId: true, projectRole: true },
    });
    if (!existing) {
      throwNotFound();
    }

    const before = { ...existing };

    await this.prisma.projectMembership.delete({
      where: { projectId_userId: { projectId, userId } },
    });

    await auditProjectMemberRemoved({
      audit: this.audit,
      actor: { userId: actor!.id, email: actor!.email },
      scope: { orgId: project.organizationId, projectId },
      member: { userId },
      before,
    });

    return { ok: true };
  }
}
