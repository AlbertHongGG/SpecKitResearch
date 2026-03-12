import { Module } from '@nestjs/common';

import { IssuesController } from './issues.controller.js';
import { IssueDetailController } from './issue-detail.controller.js';
import { IssueTransitionController } from './issue-transition.controller.js';
import { IssueCommentsController } from './issue-comments.controller.js';
import { IssueTypesController } from './issue-types.controller.js';
import { ProjectMemberGuard } from '../../common/guards/project-member.guard.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { ProjectRoleGuard } from '../../common/guards/project-role.guard.js';
import { ReadOnlyGuard } from '../../common/guards/read-only.guard.js';
import { IssueKeyService } from './issue-key.service.js';
import { WorkflowsModule } from '../workflows/workflows.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [WorkflowsModule, AuditModule],
  controllers: [
    IssuesController,
    IssueDetailController,
    IssueTransitionController,
    IssueCommentsController,
    IssueTypesController,
  ],
  providers: [IssueKeyService, SessionGuard, ProjectMemberGuard, ProjectRoleGuard, ReadOnlyGuard],
})
export class IssuesModule {}
