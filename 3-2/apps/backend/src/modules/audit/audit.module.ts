import { Module } from '@nestjs/common';

import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';
import { SessionGuard } from '../../common/auth/session.guard.js';

@Module({
  controllers: [AuditController],
  providers: [AuditService, SessionGuard],
  exports: [AuditService],
})
export class AuditModule {}
