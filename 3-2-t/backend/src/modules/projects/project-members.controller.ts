import { Body, Controller, Get, Inject, Param, Patch, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { GuardPipeline } from '../../common/guards/guard-pipeline';
import { ProjectMembersService } from './project-members.service';

@Controller('projects/:projectId/members')
@UseGuards(AuthenticatedGuard)
export class ProjectMembersController {
  constructor(@Inject(ProjectMembersService) private readonly projectMembersService: ProjectMembersService) {}

  @Get()
  listMembers(@Param('projectId') projectId: string, @Req() request: Request) {
    return this.projectMembersService.listMembers(projectId, { userId: request.session.user!.id });
  }

  @GuardPipeline({ projectParam: 'projectId', enforceReadOnly: true })
  @Put()
  assignMember(@Param('projectId') projectId: string, @Body() body: any, @Req() request: Request) {
    return this.projectMembersService.assignMember(projectId, body, {
      userId: request.session.user!.id,
      email: request.session.user!.email,
    });
  }

  @GuardPipeline({ projectParam: 'projectId', enforceReadOnly: true })
  @Patch(':membershipId')
  updateMember(@Param('projectId') projectId: string, @Param('membershipId') membershipId: string, @Body() body: any, @Req() request: Request) {
    return this.projectMembersService.updateMember(projectId, membershipId, body, {
      userId: request.session.user!.id,
      email: request.session.user!.email,
    });
  }
}
