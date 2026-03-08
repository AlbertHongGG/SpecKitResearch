import { Module } from '@nestjs/common';
import { AdminAuditController } from './admin-audit.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminOverridesController } from './admin-overrides.controller';
import { AdminPlansController } from './admin-plans.controller';

@Module({
  controllers: [AdminPlansController, AdminOverridesController, AdminAuditController, AdminDashboardController],
})
export class AdminModule {}
