import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { ProjectMemberGuard } from '../../common/guards/project-member.guard.js';
import { ProjectRoleGuard, RequireProjectRoles } from '../../common/guards/project-role.guard.js';
import { ReadOnlyGuard } from '../../common/guards/read-only.guard.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { WorkflowsService } from './workflows.service.js';

const workflowStatusSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  position: z.number().int(),
});

const workflowTransitionSchema = z.object({
  fromStatusKey: z.string().min(1),
  toStatusKey: z.string().min(1),
});

const createSchema = z.object({
  name: z.string().min(1),
  statuses: z.array(workflowStatusSchema).min(1),
  transitions: z.array(workflowTransitionSchema),
});

@Controller('projects/:projectId/workflows')
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get()
  @UseGuards(SessionGuard, ProjectMemberGuard)
  async getActiveWorkflow(@Param('projectId') projectId: string) {
    return { workflow: await this.workflows.getActiveWorkflowDto(projectId) };
  }

  @Post()
  @RequireProjectRoles('project_manager')
  @UseGuards(SessionGuard, ProjectRoleGuard, ReadOnlyGuard)
  async createWorkflowVersion(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const wf = await this.workflows.createNewVersion({
      projectId,
      createdByUserId: user!.id,
      name: body.name,
      statuses: body.statuses,
      transitions: body.transitions,
    });

    return { workflowId: wf.id };
  }
}
