import { Controller, Get, Req } from '@nestjs/common';
import { SubscriptionsRepository } from '../subscriptions/subscriptions.repository';
import { UsageRecordsRepository } from '../usage/usage-records.repository';
import { InvoicesRepository } from '../invoices/invoices.repository';

@Controller('app/summary')
export class AppSummaryController {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly usageRecordsRepository: UsageRecordsRepository,
    private readonly invoicesRepository: InvoicesRepository,
  ) {}

  @Get()
  async getSummary(@Req() req: any) {
    const [subscription, usage, invoices] = await Promise.all([
      this.subscriptionsRepository.getCurrentByOrg(req.orgId),
      this.usageRecordsRepository.listByOrg(req.orgId),
      this.invoicesRepository.listByOrg(req.orgId),
    ]);

    const risks = [] as string[];
    if (subscription?.status === 'PastDue') risks.push('PAST_DUE');
    if (subscription?.status === 'Suspended') risks.push('SUSPENDED');

    return {
      subscription,
      usageSummary: {
        periodStart: usage[0]?.periodStart ?? new Date(),
        periodEnd: usage[0]?.periodEnd ?? new Date(),
        meters: usage,
      },
      recentInvoices: invoices.slice(0, 10),
      risks,
    };
  }
}
