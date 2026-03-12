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
import { assertSprintCloseAllowed, assertSprintStartAllowed } from './sprint-state.js';
import { auditSprintClosed, auditSprintCreated, auditSprintStarted } from './sprints.audit.js';

const createSprintSchema = z.object({
  name: z.string().min(1),
  goal: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

@Controller('projects/:projectId/sprints')
export class SprintsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(SessionGuard, ProjectMemberGuard)
  async listSprints(@Param('projectId') projectId: string) {
    const sprints = await this.prisma.sprint.findMany({
      where: { projectId },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        status: true,
        goal: true,
        startDate: true,
        endDate: true,
      },
    });

    return {
      sprints: sprints.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        goal: s.goal,
        startDate: s.startDate ? toDateOnly(s.startDate) : null,
        endDate: s.endDate ? toDateOnly(s.endDate) : null,
      })),
    };
  }

  @Post()
  @RequireProjectRoles('project_manager')
  @UseGuards(SessionGuard, ProjectRoleGuard, ReadOnlyGuard)
  async createSprint(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createSprintSchema)) body: z.infer<typeof createSprintSchema>,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    });
    if (!project) throwNotFound();

    const sprint = await this.prisma.sprint.create({
      data: {
        projectId,
        name: body.name,
        goal: body.goal ?? null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        status: 'planned',
      },
    });

    await auditSprintCreated({
      audit: this.audit,
      actor: { userId: user!.id, email: user!.email },
      scope: { orgId: project.organizationId, projectId },
      sprint,
    });

    return { sprintId: sprint.id };
  }

  @Post(':sprintId/start')
  @RequireProjectRoles('project_manager')
  @UseGuards(SessionGuard, ProjectRoleGuard, ReadOnlyGuard)
  async startSprint(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { project: { select: { id: true, organizationId: true } } },
    });
    if (!sprint || sprint.projectId !== projectId) throwNotFound();

    assertSprintStartAllowed(sprint.status as any);

    const before = { sprintId: sprint.id, status: sprint.status };

    const updated = await this.prisma.sprint.update({
      where: { id: sprint.id },
      data: {
        status: 'active',
        startDate: sprint.startDate ?? new Date(),
      },
    });

    const after = { sprintId: updated.id, status: updated.status };

    await auditSprintStarted({
      audit: this.audit,
      actor: { userId: user!.id, email: user!.email },
      scope: { orgId: sprint.project.organizationId, projectId },
      sprintId: sprint.id,
      before,
      after,
    });

    return { ok: true };
  }

  @Post(':sprintId/close')
  @RequireProjectRoles('project_manager')
  @UseGuards(SessionGuard, ProjectRoleGuard, ReadOnlyGuard)
  async closeSprint(
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { project: { select: { id: true, organizationId: true } } },
    });
    if (!sprint || sprint.projectId !== projectId) throwNotFound();

    assertSprintCloseAllowed(sprint.status as any);

    const before = { sprintId: sprint.id, status: sprint.status };

    const updated = await this.prisma.sprint.update({
      where: { id: sprint.id },
      data: {
        status: 'closed',
        endDate: sprint.endDate ?? new Date(),
      },
    });

    const after = { sprintId: updated.id, status: updated.status };

    await auditSprintClosed({
      audit: this.audit,
      actor: { userId: user!.id, email: user!.email },
      scope: { orgId: sprint.project.organizationId, projectId },
      sprintId: sprint.id,
      before,
      after,
    });

    return { ok: true };
  }
}
