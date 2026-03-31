import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ServicesModule } from './services/services.module';
import { TimeSlotsModule } from './timeslots/timeslots.module';
import { BookingsModule } from './bookings/bookings.module';
import { ProviderModule } from './provider/provider.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    AuthModule,
    AuditLogsModule,
    ServicesModule,
    TimeSlotsModule,
    BookingsModule,
    ProviderModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}

