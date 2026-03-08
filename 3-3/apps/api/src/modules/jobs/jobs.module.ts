import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { GraceExpirationJob } from './grace-expiration.job';
import { JobLockService } from './job-lock.service';
import { JobsDevController } from './jobs-dev.controller';
import { JobsScheduler } from './jobs.scheduler';
import { PeriodRolloverJob } from './period-rollover.job';
import { RecurringInvoiceJob } from './recurring-invoice.job';

@Module({
  imports: [ScheduleModule.forRoot(), WebhooksModule],
  controllers: [JobsDevController],
  providers: [JobLockService, PeriodRolloverJob, RecurringInvoiceJob, GraceExpirationJob, JobsScheduler],
})
export class JobsModule {}
