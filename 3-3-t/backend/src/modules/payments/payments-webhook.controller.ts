import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { ApplyPaymentResultService } from './use-cases/apply-payment-result.service';

@Controller('webhooks/payments')
export class PaymentsWebhookController {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly applyPaymentResultService: ApplyPaymentResultService,
  ) {}

  @Post()
  @HttpCode(202)
  async handle(
    @Body()
    body: {
      provider: string;
      providerAccountId: string;
      externalEventId: string;
      invoiceId: string;
      result: 'succeeded' | 'failed';
    },
  ) {
    const dup = await this.idempotencyService.isDuplicate(
      body.provider,
      body.providerAccountId,
      body.externalEventId,
    );
    if (!dup) {
      await this.idempotencyService.register(
        body.provider,
        body.providerAccountId,
        body.externalEventId,
        body,
      );
      await this.applyPaymentResultService.execute({ invoiceId: body.invoiceId, result: body.result });
    }

    return { accepted: true, duplicate: dup };
  }
}
