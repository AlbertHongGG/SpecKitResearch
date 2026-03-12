import { Body, Controller, Get, Inject, Patch, Post, Req, UseGuards, Param } from '@nestjs/common';
import type { Request } from 'express';

import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { PlatformOrgsService } from './platform-orgs.service';

@Controller('platform/orgs')
@UseGuards(AuthenticatedGuard)
export class PlatformOrgsController {
  constructor(@Inject(PlatformOrgsService) private readonly platformOrgsService: PlatformOrgsService) {}

  @Get()
  listOrganizations(@Req() request: Request) {
    return this.platformOrgsService.listOrganizations({
      platformRoles: request.session.user?.platformRoles ?? [],
    });
  }

  @Post()
  createOrganization(@Body() body: any, @Req() request: Request) {
    return this.platformOrgsService.createOrganization(body, {
      userId: request.session.user!.id,
      email: request.session.user!.email,
      platformRoles: request.session.user?.platformRoles ?? [],
    });
  }

  @Patch(':orgId')
  updateOrganization(@Param('orgId') orgId: string, @Body() body: any, @Req() request: Request) {
    return this.platformOrgsService.updateOrganization(orgId, body, {
      userId: request.session.user!.id,
      email: request.session.user!.email,
      platformRoles: request.session.user?.platformRoles ?? [],
    });
  }
}
