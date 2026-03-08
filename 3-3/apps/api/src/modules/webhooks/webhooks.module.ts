import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { PaymentSimController } from '../billing/payment-sim.controller';
import { WebhookInboxRepo } from './webhook-inbox.repo';
import { WebhookWorkerService } from './webhook-worker.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [BillingModule, AuditModule],
  controllers: [WebhooksController, PaymentSimController],
  providers: [WebhookInboxRepo, WebhookWorkerService],
  exports: [WebhookInboxRepo, WebhookWorkerService],
})
export class WebhooksModule {}
