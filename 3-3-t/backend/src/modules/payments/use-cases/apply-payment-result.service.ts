import { Injectable } from '@nestjs/common';
import { InvoicesRepository } from '../../invoices/invoices.repository';
import { SubscriptionsRepository } from '../../subscriptions/subscriptions.repository';
import { SubscriptionStateMachineService } from '../../subscriptions/subscription-state-machine.service';

type SubscriptionStatus = 'Trial' | 'Active' | 'PastDue' | 'Suspended' | 'Canceled' | 'Expired';

@Injectable()
export class ApplyPaymentResultService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly subscriptionStateMachine: SubscriptionStateMachineService,
  ) {}

  async execute(input: { invoiceId: string; result: 'succeeded' | 'failed' }) {
    const invoice = await this.invoicesRepository.getById(input.invoiceId);
    if (!invoice) return null;

    if (invoice.status === 'Paid' || invoice.status === 'Failed') {
      return invoice;
    }

    const paid = input.result === 'succeeded';
    const updatedInvoice = await this.invoicesRepository.update(invoice.id, {
      status: paid ? 'Paid' : 'Failed',
      paidAt: paid ? new Date() : null,
      failedAt: paid ? null : new Date(),
    });

    const subscription = await this.subscriptionsRepository.getCurrentByOrg(invoice.organizationId);
    if (subscription) {
      const currentStatus = subscription.status as SubscriptionStatus;
      const nextStatus = paid
        ? this.subscriptionStateMachine.applyPaymentRecovered(currentStatus)
        : this.subscriptionStateMachine.applyPaymentFailed(currentStatus);
      await this.subscriptionsRepository.updateById(subscription.id, {
        status: nextStatus,
        gracePeriodEndAt: paid ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    return updatedInvoice;
  }
}
