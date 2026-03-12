import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditActions } from '../../../common/audit/audit-actions';
import { AuditService } from '../../../common/audit/audit.service';
import { aggregateOrderStatus } from '../../orders/order-aggregation';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminRefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.refundRequest.findMany({
      include: { subOrder: true, buyer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, approvedCents?: number) {
    const refund = await this.requireRefund(id);
    const nextApprovedCents = approvedCents ?? refund.requestedCents;
    if (nextApprovedCents <= 0 || nextApprovedCents > refund.requestedCents) {
      throw new ConflictException(
        'Approved amount must be within requested amount',
      );
    }

    await this.prisma.$transaction([
      this.prisma.refundRequest.update({
        where: { id },
        data: { status: 'APPROVED', approvedCents: nextApprovedCents },
      }),
      this.prisma.subOrder.update({
        where: { id: refund.subOrderId },
        data: { status: 'REFUNDED' },
      }),
    ]);

    await this.syncOrderStatus(refund.subOrder.orderId);
    await this.audit.write({
      actorRole: 'ADMIN',
      action: AuditActions.REFUND_REQUEST_DECIDE,
      targetType: 'RefundRequest',
      targetId: id,
      metadata: { decision: 'approve', approvedCents: nextApprovedCents },
    });

    return this.getRefund(id);
  }

  async reject(id: string) {
    const refund = await this.requireRefund(id);

    await this.prisma.$transaction([
      this.prisma.refundRequest.update({
        where: { id },
        data: { status: 'REJECTED' },
      }),
      this.prisma.subOrder.update({
        where: { id: refund.subOrderId },
        data: {
          status: refund.prevSubOrderStatus,
          prevStatus: refund.prevSubOrderStatus,
        },
      }),
    ]);

    await this.syncOrderStatus(refund.subOrder.orderId);
    await this.audit.write({
      actorRole: 'ADMIN',
      action: AuditActions.REFUND_REQUEST_DECIDE,
      targetType: 'RefundRequest',
      targetId: id,
      metadata: {
        decision: 'reject',
        restoredStatus: refund.prevSubOrderStatus,
      },
    });

    return this.getRefund(id);
  }

  async forceRefund(id: string, approvedCents?: number) {
    const refund = await this.requireRefund(id);
    const nextApprovedCents = approvedCents ?? refund.requestedCents;
    if (nextApprovedCents <= 0 || nextApprovedCents > refund.requestedCents) {
      throw new ConflictException(
        'Approved amount must be within requested amount',
      );
    }

    await this.prisma.$transaction([
      this.prisma.refundRequest.update({
        where: { id },
        data: { status: 'REFUNDED', approvedCents: nextApprovedCents },
      }),
      this.prisma.subOrder.update({
        where: { id: refund.subOrderId },
        data: { status: 'REFUNDED' },
      }),
    ]);

    await this.syncOrderStatus(refund.subOrder.orderId);
    await this.audit.write({
      actorRole: 'ADMIN',
      action: AuditActions.ORDER_FORCE_REFUND,
      targetType: 'RefundRequest',
      targetId: id,
      metadata: { decision: 'force_refund', approvedCents: nextApprovedCents },
    });

    return this.getRefund(id);
  }

  private async requireRefund(id: string) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id },
      include: { subOrder: true, buyer: true },
    });
    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    return refund;
  }

  private async getRefund(id: string) {
    return this.prisma.refundRequest.findUnique({
      where: { id },
      include: { subOrder: true, buyer: true },
    });
  }

  private async syncOrderStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { subOrders: true, payments: true },
    });
    if (!order) {
      return null;
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: aggregateOrderStatus({
          paymentStatus: order.payments[0]?.status,
          subOrderStatuses: order.subOrders.map((item) => item.status),
        }),
      },
    });
  }
}
