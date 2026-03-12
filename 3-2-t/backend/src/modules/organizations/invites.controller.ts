import { Controller, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { InvitesService } from './invites.service';

@Controller('invites')
export class InvitesController {
  constructor(@Inject(InvitesService) private readonly invitesService: InvitesService) {}

  @UseGuards(AuthenticatedGuard)
  @Post(':token/accept')
  acceptInvite(@Param('token') token: string, @Req() request: Request) {
    return this.invitesService.acceptInvite(token, request.session.user!.id);
  }
}
