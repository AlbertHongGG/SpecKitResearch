import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';

@Injectable()
export class WebhookEventService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(params: {
    provider: string;
    eventId: string;
    orderId?: string;
    transactionId?: string;
    payload: unknown;
  }) {
    return this.prisma.webhookEvent.upsert({
      where: {
        provider_eventId: { provider: params.provider, eventId: params.eventId },
      },
      update: {
        orderId: params.orderId,
        transactionId: params.transactionId,
        payload: params.payload as any,
      },
      create: {
        provider: params.provider,
        eventId: params.eventId,
        orderId: params.orderId,
        transactionId: params.transactionId,
        payload: params.payload as any,
      },
    });
  }
}
