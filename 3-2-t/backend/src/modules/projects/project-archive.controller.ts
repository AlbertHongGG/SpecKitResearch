import { Controller, Inject, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { GuardPipeline } from '../../common/guards/guard-pipeline';
import { ProjectArchiveService } from './project-archive.service';

@Controller('projects/:projectId/archive')
export class ProjectArchiveController {
  constructor(@Inject(ProjectArchiveService) private readonly projectArchiveService: ProjectArchiveService) {}

  @GuardPipeline({ projectParam: 'projectId' })
  @Post()
  archiveProject(@Param('projectId') projectId: string, @Req() request: Request) {
    return this.projectArchiveService.archiveProject(projectId, {
      userId: request.session.user!.id,
      email: request.session.user!.email,
    });
  }
}
