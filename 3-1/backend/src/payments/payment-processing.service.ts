import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Payment } from '@prisma/client';
import { PrismaService } from '../shared/db/prisma.service';
import { ErrorCodes } from '../shared/http/error-codes';
import { InventoryService } from './inventory.service';

@Injectable()
export class PaymentProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  async process(params: {
    orderId: string;
    transactionId: string;
    status: 'succeeded' | 'failed' | 'cancelled';
    paymentMethod: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: params.orderId },
        include: { subOrders: { include: { items: true } } },
      });
      if (!order) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Order not found' });
      }

      const payment = await upsertPayment(tx, params);

      if (params.status !== 'succeeded') {
        await tx.payment.update({
          where: { id: payment.id },
          data: { paymentStatus: params.status, callbackReceivedAt: new Date() },
        });
        return { ok: true };
      }

      for (const sub of order.subOrders) {
        if (sub.status === 'pending_payment') {
          await tx.subOrder.update({ where: { id: sub.id }, data: { status: 'paid' } });
        }
      }

      for (const sub of order.subOrders) {
        for (const item of sub.items) {
          const created = await tryCreateLedger(tx, {
            productId: item.productId,
            orderId: order.id,
            transactionId: params.transactionId,
            quantity: item.quantity,
          });
          if (!created) continue;
          await this.inventory.decrementStock(item.productId, item.quantity, tx);
        }
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: 'succeeded', callbackReceivedAt: new Date() },
      });

      await tx.order.update({ where: { id: order.id }, data: { status: 'paid' } });
      return { ok: true };
    });
  }
}

async function upsertPayment(
  tx: Prisma.TransactionClient,
  params: { orderId: string; transactionId: string; paymentMethod: string },
): Promise<Payment> {
  try {
    return await tx.payment.create({
      data: {
        orderId: params.orderId,
        transactionId: params.transactionId,
        paymentMethod: params.paymentMethod,
        paymentStatus: 'pending',
      },
    });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      const existing = await tx.payment.findFirst({
        where: { orderId: params.orderId, transactionId: params.transactionId },
      });
      if (!existing) {
        throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Payment conflict' });
      }
      return existing;
    }
    throw e;
  }
}

async function tryCreateLedger(
  tx: Prisma.TransactionClient,
  params: { productId: string; orderId: string; transactionId: string; quantity: number },
) {
  try {
    await tx.inventoryLedger.create({ data: params });
    return true;
  } catch (e: any) {
    if (e?.code === 'P2002') return false;
    throw e;
  }
}
