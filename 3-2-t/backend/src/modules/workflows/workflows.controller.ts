import { Body, Controller, Get, Inject, Param, Put, Req } from '@nestjs/common';
import type { Request } from 'express';

import { GuardPipeline } from '../../common/guards/guard-pipeline';
import { WorkflowsService } from './workflows.service';

@Controller('projects/:projectId/workflows')
export class WorkflowsController {
  constructor(@Inject(WorkflowsService) private readonly workflowsService: WorkflowsService) {}

  @GuardPipeline({ projectParam: 'projectId' })
  @Get()
  getActiveWorkflow(@Param('projectId') projectId: string) {
    return this.workflowsService.getActiveWorkflow(projectId);
  }

  @GuardPipeline({
    projectParam: 'projectId',
    roleRequirement: { scope: 'project', roles: ['project_manager'] },
    enforceReadOnly: true,
  })
  @Put()
  updateWorkflow(@Param('projectId') projectId: string, @Body() body: any, @Req() request: Request) {
    return this.workflowsService.updateWorkflow(
      projectId,
      {
        userId: request.session.user!.id,
        email: request.session.user!.email,
      },
      body,
    );
  }
}
