import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { SessionGuard } from '../../common/auth/session.guard.js';
import { OrgMemberGuard } from '../../common/guards/org-member.guard.js';
import { OrgRoleGuard } from '../../common/guards/org-role.guard.js';
import { ReadOnlyGuard } from '../../common/guards/read-only.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { AuditService } from '../audit/audit.service.js';
import { auditProjectCreated } from './projects.audit.js';
import { ProjectsService } from './projects.service.js';

const createSchema = z.object({
  key: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  type: z.enum(['scrum', 'kanban']),
});

@Controller('orgs/:orgId/projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(SessionGuard, OrgMemberGuard)
  async list(
    @Param('orgId') orgId: string,
    @Query('limit') limit: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    return await this.projects.listProjectsForOrg({ orgId, userId: user!.id, limit, cursor });
  }

  @Post()
  @UseGuards(SessionGuard, OrgMemberGuard, OrgRoleGuard, ReadOnlyGuard)
  async create(
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const project = await this.projects.createProject({
      orgId,
      actorUserId: user!.id,
      key: body.key,
      name: body.name,
      type: body.type,
    });

    await auditProjectCreated({
      audit: this.audit,
      actor: { userId: user!.id, email: user!.email },
      scope: { orgId, projectId: project.id },
      project,
    });

    return { projectId: project.id };
  }
}
