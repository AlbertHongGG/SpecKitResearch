import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { PaymentProcessingService } from './payment-processing.service';

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processing: PaymentProcessingService,
  ) {}

  async reconcile(orderId: string) {
    const last = await this.prisma.webhookEvent.findFirst({
      where: { orderId },
      orderBy: { receivedAt: 'desc' },
    });

    if (!last) {
      return { ok: false, processed: false, reason: 'no_webhook_event' };
    }

    const payload = last.payload as any;
    const transactionId = String(payload?.transactionId ?? '');
    const status = payload?.status as 'succeeded' | 'failed' | 'cancelled' | undefined;
    const paymentMethod = String(payload?.paymentMethod ?? payload?.provider ?? 'unknown');

    if (!transactionId || (status !== 'succeeded' && status !== 'failed' && status !== 'cancelled')) {
      return { ok: false, processed: false, reason: 'invalid_payload' };
    }

    await this.processing.process({
      orderId,
      transactionId,
      status,
      paymentMethod,
    });

    return { ok: true, processed: true };
  }
}
