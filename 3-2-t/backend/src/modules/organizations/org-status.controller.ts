import { Body, Controller, Inject, Patch, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { OrgStatusService } from './org-status.service';

@Controller('platform/orgs/:orgId/status')
@UseGuards(AuthenticatedGuard)
export class OrgStatusController {
  constructor(@Inject(OrgStatusService) private readonly orgStatusService: OrgStatusService) {}

  @Patch()
  updateStatus(@Param('orgId') orgId: string, @Body() body: { status?: 'active' | 'suspended' }, @Req() request: Request) {
    return this.orgStatusService.updateStatus(orgId, body.status ?? 'active', {
      userId: request.session.user!.id,
      email: request.session.user!.email,
      platformRoles: request.session.user?.platformRoles ?? [],
    });
  }
}
