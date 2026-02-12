import { Module } from '@nestjs/common'
import { ActivitiesModule } from './activities/activities.module'
import { AdminModule } from './admin/admin.module'
import { RegistrationsModule } from './registrations/registrations.module'
import { AuditModule } from './audit/audit.module'
import { AuthModule } from './auth/auth.module'
import { ConfigModule } from './common/config/config.module'
import { DocsModule } from './common/docs/docs.module'
import { IdempotencyModule } from './common/idempotency/idempotency.module'
import { HealthModule } from './common/health/health.module'
import { LoggerModule } from './common/logging/logger.module'
import { PrismaModule } from './common/prisma/prisma.module'
import { TimeModule } from './common/time/time.module'
import { UsersModule } from './users/users.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    PrismaModule,
    TimeModule,
    HealthModule,
    IdempotencyModule,
    AuditModule,
    DocsModule,
    UsersModule,
    AuthModule,
    ActivitiesModule,
    RegistrationsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
