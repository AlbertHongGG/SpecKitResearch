import { Module } from '@nestjs/common';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { TimeSlotsController } from './timeslots.controller';
import { TimeSlotsService } from './timeslots.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [TimeSlotsController],
  providers: [TimeSlotsService],
  exports: [TimeSlotsService],
})
export class TimeSlotsModule {}
