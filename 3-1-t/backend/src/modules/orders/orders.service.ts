import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { AuditActions } from '../../common/audit/audit-actions';
import { AuditService } from '../../common/audit/audit.service';
import type { CurrentUser } from '../../auth/types';
import { PrismaService } from '../../prisma/prisma.service';
import { aggregateOrderStatus } from './order-aggregation';
import { assertSubOrderTransition } from './suborder-state';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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

    await this.auditService.write({
      actorId: user.id,
      actorRole: 'BUYER',
      action: AuditActions.ORDER_CANCEL,
      targetType: 'Order',
      targetId: order.id,
      metadata: {
        beforeStatus: order.status,
        paymentStatus: payment?.status ?? null,
      },
    });

    return this.getOrder(user, order.id);
  }

  async confirmDelivered(
    user: CurrentUser | undefined,
    orderId: string,
    subOrderId: string,
  ) {
    this.assertUser(user);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: user.id },
      include: { subOrders: true, payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const subOrder = order.subOrders.find((item) => item.id === subOrderId);
    if (!subOrder) throw new NotFoundException('SubOrder not found');

    assertSubOrderTransition(subOrder.status, 'DELIVERED');

    const nextSubOrderStatuses = order.subOrders.map((item) =>
      item.id === subOrderId ? 'DELIVERED' : item.status,
    );
    const nextOrderStatus = aggregateOrderStatus({
      paymentStatus: order.payments[0]?.status,
      subOrderStatuses: nextSubOrderStatuses,
    });

    await this.prisma.$transaction([
      this.prisma.subOrder.update({
        where: { id: subOrder.id },
        data: { status: 'DELIVERED' },
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: nextOrderStatus },
      }),
    ]);

    await this.auditService.write({
      actorId: user.id,
      actorRole: 'BUYER',
      action: AuditActions.ORDER_DELIVER,
      targetType: 'SubOrder',
      targetId: subOrder.id,
      metadata: { orderId: order.id, from: subOrder.status, to: 'DELIVERED' },
    });

    return this.getSubOrder(user, order.id, subOrder.id);
  }
}
