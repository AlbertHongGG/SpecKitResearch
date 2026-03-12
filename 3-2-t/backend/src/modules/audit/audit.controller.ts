import { Controller, Get, Inject, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { OrgAuditQueryService } from './org-audit-query.service';
import { PlatformAuditQueryService } from './platform-audit-query.service';

@Controller()
@UseGuards(AuthenticatedGuard)
export class AuditController {
  constructor(
    @Inject(OrgAuditQueryService) private readonly orgAuditQueryService: OrgAuditQueryService,
    @Inject(PlatformAuditQueryService) private readonly platformAuditQueryService: PlatformAuditQueryService,
  ) {}

  @Get('orgs/:orgId/audit')
  listOrganizationAudit(
    @Param('orgId') orgId: string,
    @Query('action') action: string | undefined,
    @Query('projectId') projectId: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() request: Request,
  ) {
    return this.orgAuditQueryService.listAudit(
      orgId,
      { action, projectId, limit: limit ? Number(limit) : undefined },
      {
        userId: request.session.user!.id,
        platformRoles: request.session.user?.platformRoles ?? [],
      },
    );
  }

  @Get('platform/audit')
  listPlatformAudit(
    @Query('action') action: string | undefined,
    @Query('organizationId') organizationId: string | undefined,
    @Query('projectId') projectId: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() request: Request,
  ) {
    return this.platformAuditQueryService.listAudit(
      { action, organizationId, projectId, limit: limit ? Number(limit) : undefined },
      { platformRoles: request.session.user?.platformRoles ?? [] },
    );
  }
}
