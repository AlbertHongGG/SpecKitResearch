import { Injectable, NotFoundException } from '@nestjs/common';

import { aggregateOrderStatus } from '../orders/order-aggregation';
import { deductStockOrThrow } from '../catalog/stock-deduction';
import { claimPaymentCallback } from './idempotency';
import { markPaymentNeedsCompensation } from './compensation';
import { PrismaService } from '../../prisma/prisma.service';
import type { PaymentCallbackBody } from './payments.schemas';

@Injectable()
export class PaymentCallbackService {
  constructor(private readonly prisma: PrismaService) {}

  async handleCallback(body: PaymentCallbackBody) {
    const claim = await claimPaymentCallback({
      prisma: this.prisma,
      paymentId: body.paymentId,
      orderId: body.orderId,
      transactionId: body.transactionId,
    });

    if (claim.kind !== 'CLAIMED') {
      return claim;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: body.orderId },
          include: { subOrders: { include: { items: true } } },
        });
        if (!order) throw new NotFoundException('Order not found');

        await tx.payment.update({
          where: { id: body.paymentId },
          data: {
            status: body.status,
            occurredAt: new Date(),
          },
        });

        if (body.status === 'SUCCEEDED') {
          const stockItems = order.subOrders.flatMap((subOrder) =>
            subOrder.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          );
          await deductStockOrThrow({ prisma: tx as any, items: stockItems });

          await tx.subOrder.updateMany({
            where: { orderId: order.id, status: 'PENDING_PAYMENT' },
            data: { status: 'PAID' },
          });
        }

        const latest = await tx.order.findUnique({
          where: { id: order.id },
          include: { subOrders: true, payments: true },
        });

        if (latest) {
          const currentPayment = latest.payments.find(
            (payment) => payment.id === body.paymentId,
          );
          const status = aggregateOrderStatus({
            paymentStatus: currentPayment?.status,
            subOrderStatuses: latest.subOrders.map(
              (subOrder) => subOrder.status,
            ),
          });
          await tx.order.update({ where: { id: latest.id }, data: { status } });
        }
      });

      return { kind: 'UPDATED', paymentId: body.paymentId };
    } catch (error) {
      await markPaymentNeedsCompensation({
        prisma: this.prisma,
        paymentId: body.paymentId,
        reason: 'PAYMENT_CALLBACK_PARTIAL_FAILURE',
        metadata: {
          error: error instanceof Error ? error.message : 'unknown',
          orderId: body.orderId,
          transactionId: body.transactionId,
        },
      });
      throw error;
    }
  }
}
