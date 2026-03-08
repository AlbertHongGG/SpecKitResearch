import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './controllers/health.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsageMeterInterceptor } from './middleware/usage-meter.middleware';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { DbModule } from './modules/db/db.module';
import { OrgModule } from './modules/org/org.module';
import { PlansModule } from './modules/plans/plans.module';
import { AppApiModule } from './modules/app/app.module';
import { BillingModule } from './modules/billing/billing.module';
import { EntitlementsModule } from './modules/entitlements/entitlements.module';
import { UsageModule } from './modules/usage/usage.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [DbModule, AuditModule, AuthModule, OrgModule, PlansModule, EntitlementsModule, UsageModule, BillingModule, AppApiModule, WebhooksModule, JobsModule, AdminModule],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: UsageMeterInterceptor,
    },
  ],
})
export class AppModule {}
