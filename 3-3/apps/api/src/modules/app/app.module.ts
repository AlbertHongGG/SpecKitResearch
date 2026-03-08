import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { UsageModule } from '../usage/usage.module';
import { AppController } from './app.controller';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [BillingModule, EntitlementsModule, UsageModule],
  controllers: [AppController, DashboardController],
})
export class AppApiModule {}
