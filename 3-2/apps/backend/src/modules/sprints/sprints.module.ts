import { Module } from '@nestjs/common';

import { SessionGuard } from '../../common/auth/session.guard.js';
import { ProjectMemberGuard } from '../../common/guards/project-member.guard.js';
import { ProjectRoleGuard } from '../../common/guards/project-role.guard.js';
import { ReadOnlyGuard } from '../../common/guards/read-only.guard.js';
import { AuditModule } from '../audit/audit.module.js';
import { BacklogController } from './backlog.controller.js';
import { SprintsController } from './sprints.controller.js';

@Module({
  imports: [AuditModule],
  controllers: [SprintsController, BacklogController],
  providers: [SessionGuard, ProjectMemberGuard, ProjectRoleGuard, ReadOnlyGuard],
})
export class SprintsModule {}
