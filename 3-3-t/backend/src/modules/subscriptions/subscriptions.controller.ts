import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { SubscriptionsRepository } from './subscriptions.repository';
import { UpgradeSubscriptionService } from './use-cases/upgrade-subscription.service';
import { DowngradeSubscriptionService } from './use-cases/downgrade-subscription.service';
import { CancelSubscriptionService } from './use-cases/cancel-subscription.service';
import { AuditEventsService } from '../audit/audit-events.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly upgradeService: UpgradeSubscriptionService,
    private readonly downgradeService: DowngradeSubscriptionService,
    private readonly cancelService: CancelSubscriptionService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  @Get('current')
  current(@Req() req: any) {
    return this.subscriptionsRepository.getCurrentByOrg(req.orgId);
  }

  @Post('upgrade')
  async upgrade(@Req() req: any, @Body() body: { targetPlanId: string; billingCycle: string }) {
    const result = await this.upgradeService.execute(req.orgId, body);
    await this.auditEvents.append(req, 'SUBSCRIPTION_UPGRADED', 'Subscription', result.subscription.id, body);
    return result;
  }

  @Post('downgrade')
  async downgrade(@Req() req: any, @Body() body: { targetPlanId: string; billingCycle: string }) {
    const result = await this.downgradeService.execute(req.orgId, body);
    await this.auditEvents.append(req, 'SUBSCRIPTION_DOWNGRADE_SCHEDULED', 'Subscription', result?.id, body);
    return result;
  }

  @Post('cancel')
  async cancel(@Req() req: any) {
    const result = await this.cancelService.execute(req.orgId);
    await this.auditEvents.append(req, 'SUBSCRIPTION_CANCELED', 'Subscription', result?.id, {});
    return result;
  }
}
