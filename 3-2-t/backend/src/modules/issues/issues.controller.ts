import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { GuardPipeline } from '../../common/guards/guard-pipeline';
import { ProjectBoardService } from '../projects/project-board.service';
import { IssueCommentsService } from './issue-comments.service';
import { IssueTimelineService } from './issue-timeline.service';
import { IssueTransitionService } from './issue-transition.service';
import { IssuesService } from './issues.service';

@Controller('projects/:projectId')
export class IssuesController {
  constructor(
    @Inject(IssuesService) private readonly issuesService: IssuesService,
    @Inject(IssueTransitionService) private readonly issueTransitionService: IssueTransitionService,
    @Inject(IssueCommentsService) private readonly issueCommentsService: IssueCommentsService,
    @Inject(ProjectBoardService) private readonly projectBoardService: ProjectBoardService,
    @Inject(IssueTimelineService) private readonly issueTimelineService: IssueTimelineService,
  ) {}

  @GuardPipeline({ projectParam: 'projectId' })
  @Get('issues')
  listIssues(@Param('projectId') projectId: string, @Query('sort') sort?: 'created_at' | 'updated_at') {
    return this.issuesService.listIssues(projectId, sort ?? 'updated_at');
  }

  @GuardPipeline({ projectParam: 'projectId' })
  @Get('issues/:issueKey')
  getIssue(@Param('projectId') projectId: string, @Param('issueKey') issueKey: string) {
    return this.issuesService.getIssue(projectId, issueKey);
  }

  @GuardPipeline({ projectParam: 'projectId' })
  @Get('issues/:issueKey/timeline')
  getIssueTimeline(@Param('projectId') projectId: string, @Param('issueKey') issueKey: string) {
    return this.issueTimelineService.getTimeline(projectId, issueKey);
  }

  @GuardPipeline({ projectParam: 'projectId' })
  @Get('board')
  getBoard(@Param('projectId') projectId: string) {
    return this.projectBoardService.getBoardData(projectId);
  }

  @GuardPipeline({ projectParam: 'projectId' })
  @Get('backlog')
  getBacklog(@Param('projectId') projectId: string) {
    return this.projectBoardService.getBacklogData(projectId);
  }

  @GuardPipeline({
    projectParam: 'projectId',
    roleRequirement: { scope: 'project', roles: ['project_manager', 'developer'] },
    enforceReadOnly: true,
  })
  @Post('issues/create')
  createIssue(@Param('projectId') projectId: string, @Body() body: any, @Req() request: Request) {
    return this.issuesService.createIssue(projectId, body, {
      userId: request.session.user!.id,
      email: request.session.user!.email,
    });
  }

  @GuardPipeline({
    projectParam: 'projectId',
    roleRequirement: { scope: 'project', roles: ['project_manager', 'developer'] },
    enforceReadOnly: true,
  })
  @Patch('issues/:issueKey')
  updateIssue(@Param('projectId') projectId: string, @Param('issueKey') issueKey: string, @Body() body: any, @Req() request: Request) {
    return this.issuesService.updateIssue(projectId, issueKey, body, {
      userId: request.session.user!.id,
      email: request.session.user!.email,
    });
  }

  @GuardPipeline({
    projectParam: 'projectId',
    roleRequirement: { scope: 'project', roles: ['project_manager', 'developer'] },
    enforceReadOnly: true,
  })
  @Post('issues/:issueKey/transition')
  transitionIssue(@Param('projectId') projectId: string, @Param('issueKey') issueKey: string, @Body() body: any, @Req() request: Request) {
    return this.issueTransitionService.transitionIssue(projectId, issueKey, body, {
      userId: request.session.user!.id,
      email: request.session.user!.email,
    });
  }

  @GuardPipeline({
    projectParam: 'projectId',
    roleRequirement: { scope: 'project', roles: ['project_manager', 'developer'] },
    enforceReadOnly: true,
  })
  @Post('issues/:issueKey/comments')
  createComment(@Param('projectId') projectId: string, @Param('issueKey') issueKey: string, @Body() body: { body?: string }, @Req() request: Request) {
    return this.issueCommentsService.createComment(
      projectId,
      issueKey,
      {
        userId: request.session.user!.id,
        email: request.session.user!.email,
      },
      body.body ?? '',
    );
  }
}
