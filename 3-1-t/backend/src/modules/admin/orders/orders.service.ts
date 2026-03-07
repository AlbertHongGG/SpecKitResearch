import { Injectable } from '@nestjs/common';

import { aggregateOrderStatus } from '../../orders/order-aggregation';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  search(query?: { buyerId?: string }) {
    return this.prisma.order.findMany({
      where: query?.buyerId ? { buyerId: query.buyerId } : undefined,
      include: { subOrders: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  detail(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { subOrders: true, payments: true },
    });
  }

  async forceCancel(id: string) {
    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.subOrder.updateMany({
        where: { orderId: id },
        data: { status: 'CANCELLED' },
      }),
    ]);
    return this.detail(id);
  }

  async forceRefund(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { subOrders: true, payments: true },
    });
    if (!order) return null;

    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id }, data: { status: 'REFUNDED' } }),
      this.prisma.subOrder.updateMany({
        where: { orderId: id },
        data: { status: 'REFUNDED' },
      }),
      this.prisma.payment.updateMany({
        where: { orderId: id },
        data: { status: 'SUCCEEDED' },
      }),
    ]);

    const updated = await this.prisma.order.findUnique({
      where: { id },
      include: { subOrders: true, payments: true },
    });

    if (updated) {
      await this.prisma.order.update({
        where: { id: updated.id },
        data: {
          status: aggregateOrderStatus({
            paymentStatus: updated.payments[0]?.status,
            subOrderStatuses: updated.subOrders.map((item) => item.status),
          }),
        },
      });
    }

    return this.detail(id);
  }
}
