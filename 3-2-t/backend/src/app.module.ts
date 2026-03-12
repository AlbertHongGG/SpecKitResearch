import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';
import { AuthenticatedGuard } from './common/guards/authenticated.guard';
import { CsrfGuard } from './common/guards/csrf.guard';
import { OrgMembershipGuard } from './common/guards/org-membership.guard';
import { ProjectMembershipGuard } from './common/guards/project-membership.guard';
import { ReadOnlyPolicyGuard } from './common/guards/read-only-policy.guard';
import { RoleGuard } from './common/guards/role.guard';
import { ReadOnlyInterceptor } from './common/interceptors/read-only.interceptor';
import { AppLoggerService } from './common/observability/logger.service';
import { PrismaService } from './common/prisma/prisma.service';
import { AuthAuditService } from './modules/auth/auth.audit';
import { AuthController } from './modules/auth/auth.controller';
import { AuthRepository } from './modules/auth/auth.repository';
import { AuthService } from './modules/auth/auth.service';
import { AuditLogRepository } from './modules/audit/audit-log.repository';
import { AuditLogService } from './modules/audit/audit-log.service';
import { AuditController } from './modules/audit/audit.controller';
import { OrgAuditQueryService } from './modules/audit/org-audit-query.service';
import { PlatformAuditQueryService } from './modules/audit/platform-audit-query.service';
import { InvitesController } from './modules/organizations/invites.controller';
import { InvitesRepository } from './modules/organizations/invites.repository';
import { InvitesService } from './modules/organizations/invites.service';
import { OrgMembersController } from './modules/organizations/org-members.controller';
import { OrgMembersRepository } from './modules/organizations/org-members.repository';
import { OrgMembersService } from './modules/organizations/org-members.service';
import { OrgStatusController } from './modules/organizations/org-status.controller';
import { OrgStatusService } from './modules/organizations/org-status.service';
import { OrgSwitchController } from './modules/organizations/org-switch.controller';
import { OrgSwitchService } from './modules/organizations/org-switch.service';
import { OrganizationsAuditService } from './modules/organizations/organizations.audit';
import { PlatformOrgsController } from './modules/organizations/platform-orgs.controller';
import { PlatformOrgsRepository } from './modules/organizations/platform-orgs.repository';
import { PlatformOrgsService } from './modules/organizations/platform-orgs.service';
import { IssuesController } from './modules/issues/issues.controller';
import { IssuesRepository } from './modules/issues/issues.repository';
import { IssuesService } from './modules/issues/issues.service';
import { IssueLabelsRepository } from './modules/issues/issue-labels.repository';
import { IssueEpicLinksRepository } from './modules/issues/issue-epic-links.repository';
import { IssueCommentsRepository } from './modules/issues/issue-comments.repository';
import { IssueKeyGeneratorService } from './modules/issues/issue-key-generator.service';
import { IssueTimelineService } from './modules/issues/issue-timeline.service';
import { IssueTransitionService } from './modules/issues/issue-transition.service';
import { IssueEpicLinksService } from './modules/issues/issue-epic-links.service';
import { IssueCommentsService } from './modules/issues/issue-comments.service';
import { IssuesAuditService } from './modules/issues/issues.audit';
import { WorkflowsController } from './modules/workflows/workflows.controller';
import { WorkflowsRepository } from './modules/workflows/workflows.repository';
import { WorkflowStatusService } from './modules/workflows/workflow-status.service';
import { WorkflowsService } from './modules/workflows/workflows.service';
import { SprintsController } from './modules/sprints/sprints.controller';
import { SprintsRepository } from './modules/sprints/sprints.repository';
import { SprintsService } from './modules/sprints/sprints.service';
import { ProjectBoardService } from './modules/projects/project-board.service';
import { ProjectMembersController } from './modules/projects/project-members.controller';
import { ProjectMembersRepository } from './modules/projects/project-members.repository';
import { ProjectMembersService } from './modules/projects/project-members.service';
import { ProjectArchiveController } from './modules/projects/project-archive.controller';
import { ProjectArchiveService } from './modules/projects/project-archive.service';
import { ProjectsController } from './modules/projects/projects.controller';
import { ProjectsService } from './modules/projects/projects.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] })],
  controllers: [
    AppController,
    AuthController,
    AuditController,
    InvitesController,
    PlatformOrgsController,
    OrgMembersController,
    OrgStatusController,
    OrgSwitchController,
    ProjectsController,
    ProjectMembersController,
    ProjectArchiveController,
    WorkflowsController,
    IssuesController,
    SprintsController,
  ],
  providers: [
    PrismaService,
    AppLoggerService,
    AuthRepository,
    AuthService,
    AuthAuditService,
    AuditLogRepository,
    AuditLogService,
    OrgAuditQueryService,
    PlatformAuditQueryService,
    PlatformOrgsRepository,
    PlatformOrgsService,
    OrgMembersRepository,
    OrgMembersService,
    OrgStatusService,
    OrganizationsAuditService,
    InvitesRepository,
    InvitesService,
    OrgSwitchService,
    ProjectsService,
    ProjectMembersRepository,
    ProjectMembersService,
    ProjectArchiveService,
    WorkflowsRepository,
    WorkflowStatusService,
    WorkflowsService,
    IssuesRepository,
    IssueLabelsRepository,
    IssueEpicLinksRepository,
    IssueCommentsRepository,
    IssueKeyGeneratorService,
    IssueEpicLinksService,
    IssueCommentsService,
    IssueTimelineService,
    IssueTransitionService,
    IssuesAuditService,
    IssuesService,
    SprintsRepository,
    SprintsService,
    ProjectBoardService,
    AuthenticatedGuard,
    CsrfGuard,
    OrgMembershipGuard,
    ProjectMembershipGuard,
    ReadOnlyPolicyGuard,
    ReadOnlyInterceptor,
    RoleGuard,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}