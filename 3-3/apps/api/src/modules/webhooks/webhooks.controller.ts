import { Body, Controller, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from '../../common/app-error';
import { WebhookInboxRepo } from './webhook-inbox.repo';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly inbox: WebhookInboxRepo) {}

  @Post('payment/:provider')
  async paymentWebhook(
    @Param('provider') provider: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Signature verification is provider-specific; stub for now.
    // Expect providers to include invoiceId + orgId + eventId.
    const b = body as any;
    const providerEventId = String(b?.eventId ?? b?.id ?? 'missing');
    const orgId = b?.orgId;
    const invoiceId = b?.invoiceId;
    const result = b?.result;

    if (!orgId || !invoiceId || (result !== 'success' && result !== 'fail')) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: 'Invalid webhook payload' });
    }

    try {
      await this.inbox.writeInboxEvent({
        provider,
        providerEventId,
        payload: { kind: 'payment', orgId, invoiceId, result, raw: body },
      });
    } catch (e) {
      // Treat idempotent replay as success for webhooks.
      if (e instanceof AppError && e.errorCode === 'IDEMPOTENT_REPLAY') {
        res.status(204);
        return;
      }
      throw e;
    }

    res.status(204);
    return;
  }
}
