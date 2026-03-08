import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BillingController } from './billing.controller';
import { InvoicesRepo } from './invoices.repo';
import { PaymentSimController } from './payment-sim.controller';
import { PaymentMethodsController } from './payment-methods.controller';
import { SubscriptionsRepo } from './subscriptions.repo';
import { SubscriptionGuard } from './subscription.guard';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [AuditModule],
  controllers: [BillingController, PaymentMethodsController],
  providers: [SubscriptionsRepo, InvoicesRepo, SubscriptionService, SubscriptionGuard],
  exports: [SubscriptionsRepo, InvoicesRepo, SubscriptionService],
})
export class BillingModule {}
