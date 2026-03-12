import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { GuardPipeline } from '../../common/guards/guard-pipeline';
import { SprintsService } from './sprints.service';

@Controller('projects/:projectId/sprints')
export class SprintsController {
  constructor(@Inject(SprintsService) private readonly sprintsService: SprintsService) {}

  @GuardPipeline({ projectParam: 'projectId' })
  @Get()
  listSprints(@Param('projectId') projectId: string) {
    return this.sprintsService.listSprints(projectId);
  }

  @GuardPipeline({
    projectParam: 'projectId',
    roleRequirement: { scope: 'project', roles: ['project_manager'] },
    enforceReadOnly: true,
  })
  @Post()
  createSprint(@Param('projectId') projectId: string, @Body() body: any, @Req() request: Request) {
    return this.sprintsService.createSprint(
      projectId,
      body,
      {
        userId: request.session.user!.id,
        email: request.session.user!.email,
      },
    );
  }

  @GuardPipeline({
    projectParam: 'projectId',
    roleRequirement: { scope: 'project', roles: ['project_manager'] },
    enforceReadOnly: true,
  })
  @Post(':sprintId/start')
  startSprint(@Param('projectId') projectId: string, @Param('sprintId') sprintId: string, @Req() request: Request) {
    return this.sprintsService.startSprint(projectId, sprintId, {
      userId: request.session.user!.id,
      email: request.session.user!.email,
    });
  }

  @GuardPipeline({
    projectParam: 'projectId',
    roleRequirement: { scope: 'project', roles: ['project_manager'] },
    enforceReadOnly: true,
  })
  @Post(':sprintId/close')
  closeSprint(@Param('projectId') projectId: string, @Param('sprintId') sprintId: string, @Req() request: Request) {
    return this.sprintsService.closeSprint(projectId, sprintId, {
      userId: request.session.user!.id,
      email: request.session.user!.email,
    });
  }
}
