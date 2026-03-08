import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { SubscriptionService } from '../billing/subscription.service';
import { WebhookInboxRepo } from './webhook-inbox.repo';

type PaymentInboxPayload = {
  kind: 'payment';
  orgId: string;
  invoiceId: string;
  result: 'success' | 'fail';
};

@Injectable()
export class WebhookWorkerService {
  constructor(
    private readonly inbox: WebhookInboxRepo,
    private readonly subs: SubscriptionService,
    private readonly audit: AuditService,
  ) {}

  async processBatch(limit = 25) {
    const batch = await this.inbox.fetchNextBatch(limit);
    for (const evt of batch) {
      await this.processOne(evt.id, evt.payload as any).catch(async (e) => {
        const msg = e instanceof Error ? e.message : String(e);
        await this.inbox.markFailed(evt.id, msg);
      });
    }
  }

  async processOne(inboxId: string, payload: unknown) {
    const p = payload as Partial<PaymentInboxPayload>;
    if (p.kind !== 'payment' || !p.orgId || !p.invoiceId || (p.result !== 'success' && p.result !== 'fail')) {
      await this.inbox.markFailed(inboxId, 'Unsupported webhook payload');
      return;
    }

    await this.subs.applyPaymentResult({ orgId: p.orgId, invoiceId: p.invoiceId, result: p.result });

    await this.audit.writeAuditLog({
      actorUserId: null,
      actorRoleContext: 'SYSTEM',
      organizationId: p.orgId,
      action: 'billing.webhook.payment.processed',
      targetType: 'Invoice',
      targetId: p.invoiceId,
      payload: { inboxId, provider: 'unknown', result: p.result },
    });

    await this.inbox.markProcessed(inboxId);
  }
}
