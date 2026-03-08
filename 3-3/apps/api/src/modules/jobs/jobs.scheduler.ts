import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WebhookWorkerService } from '../webhooks/webhook-worker.service';
import { GraceExpirationJob } from './grace-expiration.job';
import { JobLockService } from './job-lock.service';
import { PeriodRolloverJob } from './period-rollover.job';
import { RecurringInvoiceJob } from './recurring-invoice.job';

@Injectable()
export class JobsScheduler {
  constructor(
    private readonly locks: JobLockService,
    private readonly rollover: PeriodRolloverJob,
    private readonly recurring: RecurringInvoiceJob,
    private readonly grace: GraceExpirationJob,
    private readonly webhooks: WebhookWorkerService,
  ) {}

  @Cron('*/30 * * * * *')
  async tick() {
    if (process.env.JOBS_ENABLED === 'false') return;

    const instance = process.env.INSTANCE_ID ?? 'local';
    await this.locks.withLock({ name: 'jobs.tick', lockedBy: instance, ttlMs: 25_000 }, async () => {
      const now = new Date();
      await this.rollover.runOnce(now);
      await this.recurring.runOnce(now);
      await this.grace.runOnce(now);
      await this.webhooks.processBatch(25);
    });
  }
}
