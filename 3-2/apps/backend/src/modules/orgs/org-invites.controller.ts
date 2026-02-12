import { Body, Controller, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { OrgMemberGuard } from '../../common/guards/org-member.guard.js';
import { OrgRoleGuard } from '../../common/guards/org-role.guard.js';
import { OrgInvitesService } from './org-invites.service.js';

const createSchema = z.object({ email: z.string().email() });
const acceptSchema = z.object({
  displayName: z.string().min(1),
  password: z.string().min(8).optional(),
});

@Controller()
export class OrgInvitesController {
  constructor(private readonly invites: OrgInvitesService) {}

  @Post('orgs/:orgId/invites')
  @UseGuards(SessionGuard, OrgMemberGuard, OrgRoleGuard)
  async createInvite(
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
    @CurrentUser() user: RequestWithUser['user'],
  ) {
    const invite = await this.invites.createInvite(orgId, user!.id, body.email);
    return { invite: { token: invite.token, expiresAt: invite.expiresAt.toISOString(), email: invite.email } };
  }

  @Post('invites/:token/accept')
  async acceptInvite(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(acceptSchema)) body: z.infer<typeof acceptSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    return await this.invites.acceptInvite(token, body, res);
  }
}
