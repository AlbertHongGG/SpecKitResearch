import { Module } from '@nestjs/common';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { ServicesModule } from '../services/services.module';
import { TimeSlotsModule } from '../timeslots/timeslots.module';

import { ProviderBookingsController } from './provider-bookings.controller';
import { ProviderServicesController } from './provider-services.controller';
import { ProviderTimeSlotsController } from './provider-timeslots.controller';
import { ProviderBookingsService } from './provider-bookings.service';

@Module({
  imports: [AuthModule, AuditLogsModule, ServicesModule, TimeSlotsModule],
  controllers: [ProviderServicesController, ProviderTimeSlotsController, ProviderBookingsController],
  providers: [ProviderBookingsService],
})
export class ProviderModule {}
