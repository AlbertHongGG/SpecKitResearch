import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { GuardPipeline } from '../../common/guards/guard-pipeline';
import { OrgMembersService } from './org-members.service';

@Controller('orgs/:orgId')
@UseGuards(AuthenticatedGuard)
export class OrgMembersController {
  constructor(@Inject(OrgMembersService) private readonly orgMembersService: OrgMembersService) {}

  @Get()
  getOverview(@Param('orgId') orgId: string, @Req() request: Request) {
    return this.orgMembersService.getOrganizationOverview(orgId, { userId: request.session.user!.id });
  }

  @Get('members')
  listMembers(@Param('orgId') orgId: string, @Req() request: Request) {
    return this.orgMembersService.listMembers(orgId, { userId: request.session.user!.id });
  }

  @GuardPipeline({ organizationParam: 'orgId', enforceReadOnly: true })
  @Post('members/invite')
  inviteMember(@Param('orgId') orgId: string, @Body() body: any, @Req() request: Request) {
    return this.orgMembersService.inviteMember(orgId, body, {
      userId: request.session.user!.id,
      email: request.session.user!.email,
    });
  }

  @GuardPipeline({ organizationParam: 'orgId', enforceReadOnly: true })
  @Patch('members/:membershipId')
  updateMember(@Param('orgId') orgId: string, @Param('membershipId') membershipId: string, @Body() body: any, @Req() request: Request) {
    return this.orgMembersService.updateMember(orgId, membershipId, body, {
      userId: request.session.user!.id,
      email: request.session.user!.email,
    });
  }
}
