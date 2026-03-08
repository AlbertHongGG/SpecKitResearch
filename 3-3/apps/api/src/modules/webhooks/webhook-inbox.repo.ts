import { Injectable } from '@nestjs/common';
import { Prisma } from '@sb/db';
import { AppError } from '../../common/app-error';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class WebhookInboxRepo {
  constructor(private readonly prisma: PrismaService) {}

  async writeInboxEvent(input: { provider: string; providerEventId: string; payload: unknown }) {
    try {
      return await this.prisma.webhookEventInbox.create({
        data: {
          provider: input.provider,
          providerEventId: input.providerEventId,
          payload: input.payload as any,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppError({ errorCode: 'IDEMPOTENT_REPLAY', status: 409, message: 'Duplicate webhook event' });
      }
      throw e;
    }
  }

  async fetchNextBatch(limit: number) {
    return this.prisma.webhookEventInbox.findMany({
      where: { status: 'RECEIVED' },
      orderBy: { receivedAt: 'asc' },
      take: limit,
    });
  }

  async markProcessed(id: string) {
    await this.prisma.webhookEventInbox.update({ where: { id }, data: { status: 'PROCESSED', processedAt: new Date(), error: null } });
  }

  async markFailed(id: string, error: string) {
    await this.prisma.webhookEventInbox.update({
      where: { id },
      data: { status: 'FAILED', processedAt: new Date(), error },
    });
  }
}
