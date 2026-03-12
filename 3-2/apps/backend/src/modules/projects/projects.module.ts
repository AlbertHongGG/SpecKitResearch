import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { OrgMemberGuard } from '../../common/guards/org-member.guard.js';
import { OrgRoleGuard } from '../../common/guards/org-role.guard.js';
import { ProjectMemberGuard } from '../../common/guards/project-member.guard.js';
import { ReadOnlyGuard } from '../../common/guards/read-only.guard.js';
import { ProjectOrgAdminGuard } from '../../common/guards/project-org-admin.guard.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { ProjectMembersController } from './project-members.controller.js';
import { ProjectSettingsController } from './project-settings.controller.js';

@Module({
  imports: [AuditModule],
  controllers: [ProjectsController, ProjectMembersController, ProjectSettingsController],
  providers: [ProjectsService, SessionGuard, OrgMemberGuard, OrgRoleGuard, ProjectMemberGuard, ProjectOrgAdminGuard, ReadOnlyGuard],
})
export class ProjectsModule {}
