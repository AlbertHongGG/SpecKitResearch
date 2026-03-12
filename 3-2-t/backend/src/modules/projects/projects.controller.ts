import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { GuardPipeline } from '../../common/guards/guard-pipeline';
import { ProjectsService } from './projects.service';

@Controller('orgs/:orgId/projects')
@UseGuards(AuthenticatedGuard)
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projectsService: ProjectsService) {}

  @Get()
  listProjects(@Param('orgId') orgId: string, @Req() request: Request) {
    return this.projectsService.listOrganizationProjects(orgId, { userId: request.session.user!.id });
  }

  @GuardPipeline({ organizationParam: 'orgId', enforceReadOnly: true })
  @Post('create')
  createProject(@Param('orgId') orgId: string, @Body() body: any, @Req() request: Request) {
    return this.projectsService.createProject(orgId, body, {
      userId: request.session.user!.id,
      email: request.session.user!.email,
    });
  }
}
