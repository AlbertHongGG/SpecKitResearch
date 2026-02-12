import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { ErrorCodes } from '../shared/http/error-codes';
import { deriveOrderStatus } from './order-status';
import { assertTransition, type SubOrderStatus } from './suborder-state-machine';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit.actions';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listMyOrders(buyerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
      include: { subOrders: true, payments: true },
      take: 50,
    });
    return orders;
  }

  async getMyOrder(buyerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId },
      include: {
        subOrders: { include: { items: true } },
        payments: true,
      },
    });
    if (!order) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Order not found' });
    return order;
  }

  async cancelUnpaidOrder(buyerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId },
      include: { subOrders: true },
    });
    if (!order) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Order not found' });

    const statuses = order.subOrders.map((s) => s.status as SubOrderStatus);
    if (!statuses.every((s) => s === 'pending_payment')) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Order cannot be cancelled after payment' });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.subOrder.updateMany({
        where: { orderId: order.id },
        data: { status: 'cancelled' },
      });

      const subs = await tx.subOrder.findMany({ where: { orderId: order.id }, select: { status: true } });
      const status = deriveOrderStatus(subs as any);
      await tx.order.update({ where: { id: order.id }, data: { status } });

      return tx.order.findUnique({
        where: { id: order.id },
        include: { subOrders: { include: { items: true } }, payments: true },
      });
    });

    await this.audit.write({
      actorUserId: buyerId,
      actorRole: 'buyer',
      action: AuditActions.ORDER_CANCEL,
      targetType: 'Order',
      targetId: orderId,
    });

    return updated;
  }

  async confirmReceipt(buyerId: string, subOrderId: string) {
    const sub = await this.prisma.subOrder.findUnique({ where: { id: subOrderId }, include: { order: true } });
    if (!sub) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'SubOrder not found' });
    if (sub.order.buyerId !== buyerId) {
      throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Forbidden' });
    }

    try {
      assertTransition(sub.status as SubOrderStatus, 'delivered');
    } catch {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Invalid transition' });
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await tx.subOrder.update({ where: { id: subOrderId }, data: { status: 'delivered' } });

      const subs = await tx.subOrder.findMany({ where: { orderId: sub.orderId }, select: { status: true } });
      const status = deriveOrderStatus(subs as any);
      await tx.order.update({ where: { id: sub.orderId }, data: { status } });

      return tx.order.findUnique({
        where: { id: sub.orderId },
        include: { subOrders: { include: { items: true } }, payments: true },
      });
    });

    await this.audit.write({
      actorUserId: buyerId,
      actorRole: 'buyer',
      action: AuditActions.ORDER_CONFIRM_RECEIPT,
      targetType: 'SubOrder',
      targetId: subOrderId,
      metadata: { orderId: sub.orderId },
    });

    return updatedOrder;
  }
}
