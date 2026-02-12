import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ActivitiesModule } from './activities/activities.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { getEnv } from './common/config/env';
import { buildPinoHttpOptions } from './common/logging/pino';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { UsersModule } from './users/users.module';
import { AdminActivitiesModule } from './admin/admin-activities.module';
import { AdminRegistrationsModule } from './admin/admin-registrations.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: buildPinoHttpOptions(),
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    MeModule,
    ActivitiesModule,
    RegistrationsModule,
    AdminActivitiesModule,
    AdminRegistrationsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: 'APP_ENV',
      useFactory: () => getEnv(),
    },
  ],
})
export class AppModule {}
