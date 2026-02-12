import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { WebhookEventService } from './webhook-event.service';
import { PaymentProcessingService } from './payment-processing.service';
import { PrismaService } from '../shared/db/prisma.service';
import { ReconciliationService } from './reconciliation.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { assertWebhookSecret } from './webhook-signature';

const webhookSchema = z.object({
  provider: z.string().default('mock'),
  eventId: z.string().min(4),
  orderId: z.string().min(1),
  transactionId: z.string().min(8),
  status: z.enum(['succeeded', 'failed', 'cancelled']),
  paymentMethod: z.string().default('mock'),
});

const reconcileSchema = z.object({
  orderId: z.string().min(1),
});

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly events: WebhookEventService,
    private readonly processing: PaymentProcessingService,
    private readonly prisma: PrismaService,
    private readonly reconciliation: ReconciliationService,
  ) {}

  @Post('webhook')
  async webhook(
    @Req() req: Request,
    @Body(new ZodValidationPipe(webhookSchema)) body: z.infer<typeof webhookSchema>,
  ) {
    assertWebhookSecret(req);
    await this.events.upsert({
      provider: body.provider,
      eventId: body.eventId,
      orderId: body.orderId,
      transactionId: body.transactionId,
      payload: body,
    });
    await this.processing.process({
      orderId: body.orderId,
      transactionId: body.transactionId,
      status: body.status,
      paymentMethod: body.paymentMethod,
    });
    return { ok: true };
  }

  @Get('result')
  async result(@Query('orderId') orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true, subOrders: true },
    });
    if (!order) return { found: false };
    const last = order.payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    return {
      found: true,
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: last?.paymentStatus ?? 'pending',
    };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @Post('reconcile')
  async reconcile(@Body(new ZodValidationPipe(reconcileSchema)) body: z.infer<typeof reconcileSchema>) {
    return this.reconciliation.reconcile(body.orderId);
  }
}
