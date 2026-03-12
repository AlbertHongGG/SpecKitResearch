import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { GuardPipeline } from '../../common/guards/guard-pipeline';
import { OrgSwitchService } from './org-switch.service';

@Controller()
export class OrgSwitchController {
  constructor(@Inject(OrgSwitchService) private readonly orgSwitchService: OrgSwitchService) {}

  @UseGuards(AuthenticatedGuard)
  @Get('orgs')
  listOrganizations(@Req() request: Request) {
    return this.orgSwitchService.listOrganizations(request.session.user!.id);
  }

  @UseGuards(AuthenticatedGuard)
  @Post('orgs/switch')
  async switchOrganization(@Req() request: Request, @Body() body: { organizationId?: string }) {
    const organization = await this.orgSwitchService.switchOrganization(request.session.user!.id, body.organizationId ?? '');
    request.session.activeOrganizationId = organization.organizationId;
    request.session.resourceState = {
      ...(request.session.resourceState ?? {}),
      organizationStatus: organization.status,
    };

    return {
      activeOrganizationId: organization.organizationId,
      organization,
    };
  }

  @Get('orgs/:orgId/access')
  @GuardPipeline({ organizationParam: 'orgId' })
  getOrganizationAccess(@Param('orgId') orgId: string) {
    return { organizationId: orgId, access: 'member' };
  }

  @Get('orgs/:orgId/admin/access')
  @GuardPipeline({
    organizationParam: 'orgId',
    roleRequirement: { scope: 'organization', roles: ['org_admin'] },
  })
  getOrganizationAdminAccess(@Param('orgId') orgId: string) {
    return { organizationId: orgId, access: 'org_admin' };
  }

  @Get('projects/:projectId/access')
  @GuardPipeline({ projectParam: 'projectId' })
  getProjectAccess(@Param('projectId') projectId: string) {
    return { projectId, access: 'project_member' };
  }
}
