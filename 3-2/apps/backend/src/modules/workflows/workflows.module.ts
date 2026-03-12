import { Module } from '@nestjs/common';

import { SessionGuard } from '../../common/auth/session.guard.js';
import { ProjectMemberGuard } from '../../common/guards/project-member.guard.js';
import { ProjectRoleGuard } from '../../common/guards/project-role.guard.js';
import { ReadOnlyGuard } from '../../common/guards/read-only.guard.js';
import { WorkflowsController } from './workflows.controller.js';
import { WorkflowsService } from './workflows.service.js';

@Module({
  controllers: [WorkflowsController],
  providers: [WorkflowsService, SessionGuard, ProjectMemberGuard, ProjectRoleGuard, ReadOnlyGuard],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
