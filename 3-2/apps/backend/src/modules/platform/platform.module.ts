import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard.js';
import { PlatformOrgsController } from './platform-orgs.controller.js';
import { PlatformOrgsService } from './platform-orgs.service.js';

@Module({
  imports: [AuditModule],
  controllers: [PlatformOrgsController],
  providers: [PlatformOrgsService, SessionGuard, PlatformAdminGuard],
})
export class PlatformModule {}
