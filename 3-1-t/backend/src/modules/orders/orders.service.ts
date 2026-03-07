import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import type { CurrentUser } from '../../auth/types';
import { PrismaService } from '../../prisma/prisma.service';
import { aggregateOrderStatus } from './order-aggregation';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private assertUser(
    user: CurrentUser | undefined,
  ): asserts user is CurrentUser {
    if (!user) throw new UnauthorizedException('Authentication required');
  }

  async list(user: CurrentUser | undefined) {
    this.assertUser(user);
    return this.prisma.order.findMany({
      where: { buyerId: user.id },
      include: { subOrders: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(user: CurrentUser | undefined, id: string) {
    this.assertUser(user);
    const order = await this.prisma.order.findFirst({
      where: { id, buyerId: user.id },
      include: { subOrders: { include: { items: true } }, payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const paymentStatus = order.payments[0]?.status;
    return {
      ...order,
      aggregateStatus: aggregateOrderStatus({
        paymentStatus,
        subOrderStatuses: order.subOrders.map((subOrder) => subOrder.status),
      }),
    };
  }

  async getSubOrder(
    user: CurrentUser | undefined,
    orderId: string,
    subOrderId: string,
  ) {
    const order = await this.getOrder(user, orderId);
    const subOrder = order.subOrders.find((item) => item.id === subOrderId);
    if (!subOrder) throw new NotFoundException('SubOrder not found');
    return subOrder;
  }

  async cancelBeforePayment(user: CurrentUser | undefined, orderId: string) {
    this.assertUser(user);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: user.id },
      include: { payments: true, subOrders: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const payment = order.payments[0];
    if (payment && payment.status !== 'PENDING') {
      throw new ConflictException('Order is already paid');
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.subOrder.updateMany({
        where: { orderId: order.id },
        data: { status: 'CANCELLED' },
      }),
      ...(payment
        ? [
            this.prisma.payment.update({
              where: { id: payment.id },
              data: { status: 'CANCELLED' },
            }),
          ]
        : []),
    ]);

    return { ok: true };
  }
}
