import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { OrgsController } from './orgs.controller.js';
import { OrgInvitesController } from './org-invites.controller.js';
import { OrgInvitesService } from './org-invites.service.js';
import { MAILER } from '../../common/mailer/mailer.js';
import { ConsoleMailer } from '../../common/mailer/console-mailer.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { OrgMemberGuard } from '../../common/guards/org-member.guard.js';
import { OrgRoleGuard } from '../../common/guards/org-role.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [OrgsController, OrgInvitesController],
  providers: [
    OrgInvitesService,
    SessionGuard,
    OrgMemberGuard,
    OrgRoleGuard,
    { provide: MAILER, useClass: ConsoleMailer },
  ],
})
export class OrgsModule {}
