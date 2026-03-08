import { Module } from '@nestjs/common';

import { AdminUsageController } from './admin.usage.controller';
import { AdminAuditController } from './admin.audit.controller';
import { AdminKeysController } from './admin.keys.controller';
import { AdminUsersController } from './admin.users.controller';

@Module({
  controllers: [AdminUsageController, AdminAuditController, AdminKeysController, AdminUsersController],
})
export class AdminModule {}
