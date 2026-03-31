import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { PrismaModule } from '../common/db/prisma.module'
import { ProviderBookingsController } from './provider-bookings.controller'
import { ProviderBookingsService } from './provider-bookings.service'
import { ProviderServicesController } from './provider-services.controller'
import { ProviderServicesService } from './provider-services.service'
import { ProviderTimeslotsController } from './provider-timeslots.controller'
import { ProviderTimeslotsService } from './provider-timeslots.service'

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [
    ProviderServicesController,
    ProviderTimeslotsController,
    ProviderBookingsController,
  ],
  providers: [ProviderServicesService, ProviderTimeslotsService, ProviderBookingsService],
})
export class ProviderModule {}
