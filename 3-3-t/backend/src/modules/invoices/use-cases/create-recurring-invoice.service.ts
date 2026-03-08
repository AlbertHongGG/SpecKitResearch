import { Injectable } from '@nestjs/common';
import { InvoicesRepository } from '../invoices.repository';

@Injectable()
export class CreateRecurringInvoiceService {
  constructor(private readonly invoicesRepository: InvoicesRepository) {}

  execute(subscription: {
    organizationId: string;
    id: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }, totalCents: number, currency = 'USD') {
    return this.invoicesRepository.create({
      organizationId: subscription.organizationId,
      subscriptionId: subscription.id,
      status: 'Draft',
      billingPeriodStart: subscription.currentPeriodStart,
      billingPeriodEnd: subscription.currentPeriodEnd,
      totalCents,
      currency,
      invoiceType: 'RECURRING',
    });
  }
}
