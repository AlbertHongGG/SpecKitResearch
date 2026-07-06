import { Module } from '@nestjs/common';

import { ActivitiesModule } from './activities/activities.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { HealthController } from './health.controller';
import { MeController } from './me.controller';
import { IdempotencyModule } from './idempotency/idempotency.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuditModule,
    IdempotencyModule,
    AuthModule,
    ActivitiesModule,
    RegistrationsModule,
    AdminModule,
  ],
  controllers: [HealthController, MeController],
})
export class AppModule {}
