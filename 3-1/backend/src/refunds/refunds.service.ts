import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { ErrorCodes } from '../shared/http/error-codes';
import { assertTransition, type SubOrderStatus } from '../orders/suborder-state-machine';
import { deriveOrderStatus } from '../orders/order-status';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit.actions';
import { assertRefundWindow } from './refund-policy';

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createRefundRequest(params: {
    buyerId: string;
    subOrderId: string;
    reason: string;
    requestedAmount: number;
  }) {
    const sub = await this.prisma.subOrder.findUnique({
      where: { id: params.subOrderId },
      include: { order: true },
    });
    if (!sub) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'SubOrder not found' });
    if (sub.order.buyerId !== params.buyerId) {
      throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Forbidden' });
    }

    const currentStatus = sub.status as SubOrderStatus;
    if (!['paid', 'shipped', 'delivered'].includes(currentStatus)) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Refund not allowed in current state' });
    }

    if (currentStatus === 'delivered') {
      assertRefundWindow({ deliveredAt: sub.updatedAt, days: 7 });
    }

    const existing = await this.prisma.refundRequest.findFirst({
      where: {
        subOrderId: sub.id,
        status: { in: ['requested', 'approved', 'refunded'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Refund already exists' });
    }

    const refund = await this.prisma.$transaction(async (tx) => {
      try {
        assertTransition(currentStatus, 'refund_requested');
      } catch {
        throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Invalid transition' });
      }

      const updatedSub = await tx.subOrder.update({
        where: { id: sub.id },
        data: {
          status: 'refund_requested',
          refundRequestedPrevStatus: currentStatus,
        },
      });

      const rr = await tx.refundRequest.create({
        data: {
          orderId: sub.orderId,
          subOrderId: sub.id,
          buyerId: params.buyerId,
          reason: params.reason,
          requestedAmount: params.requestedAmount,
          approvedAmount: null,
          status: 'requested',
          prevSubOrderStatus: currentStatus,
        },
      });

      const subs = await tx.subOrder.findMany({ where: { orderId: sub.orderId }, select: { status: true } });
      const orderStatus = deriveOrderStatus(subs as any);
      await tx.order.update({ where: { id: sub.orderId }, data: { status: orderStatus } });

      return { rr, updatedSub };
    });

    await this.audit.write({
      actorUserId: params.buyerId,
      actorRole: 'buyer',
      action: AuditActions.REFUND_REQUEST,
      targetType: 'RefundRequest',
      targetId: refund.rr.id,
      metadata: { subOrderId: params.subOrderId },
    });

    return refund.rr;
  }

  async listForSeller(params: { sellerId: string; status?: string }) {
    return this.prisma.refundRequest.findMany({
      where: {
        status: params.status,
        subOrder: { sellerId: params.sellerId },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async sellerApprove(params: { sellerId: string; refundId: string; approvedAmount?: number }) {
    const refund = await this.prisma.refundRequest.findUnique({ where: { id: params.refundId }, include: { subOrder: true } });
    if (!refund) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Refund not found' });
    if (refund.subOrder.sellerId !== params.sellerId) {
      throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Forbidden' });
    }
    if (refund.status !== 'requested') {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Refund not in requested state' });
    }

    const approvedAmount = params.approvedAmount ?? refund.requestedAmount;
    if (approvedAmount < 0 || approvedAmount > refund.requestedAmount) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Invalid approved amount' });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const rr = await tx.refundRequest.update({
        where: { id: refund.id },
        data: {
          approvedAmount,
          status: 'refunded',
        },
      });

      await tx.subOrder.update({ where: { id: refund.subOrderId }, data: { status: 'refunded' } });

      const subs = await tx.subOrder.findMany({ where: { orderId: refund.orderId }, select: { status: true } });
      const orderStatus = deriveOrderStatus(subs as any);
      await tx.order.update({ where: { id: refund.orderId }, data: { status: orderStatus } });

      return rr;
    });

    await this.audit.write({
      actorUserId: params.sellerId,
      actorRole: 'seller',
      action: AuditActions.REFUND_APPROVE,
      targetType: 'RefundRequest',
      targetId: params.refundId,
      metadata: { approvedAmount },
    });

    return updated;
  }

  async sellerReject(params: { sellerId: string; refundId: string; note?: string }) {
    const refund = await this.prisma.refundRequest.findUnique({ where: { id: params.refundId }, include: { subOrder: true } });
    if (!refund) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Refund not found' });
    if (refund.subOrder.sellerId !== params.sellerId) {
      throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Forbidden' });
    }
    if (refund.status !== 'requested') {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Refund not in requested state' });
    }

    const prev = (refund.prevSubOrderStatus ?? refund.subOrder.refundRequestedPrevStatus ?? 'paid') as SubOrderStatus;

    const updated = await this.prisma.$transaction(async (tx) => {
      const rr = await tx.refundRequest.update({
        where: { id: refund.id },
        data: {
          status: 'rejected',
        },
      });

      await tx.subOrder.update({
        where: { id: refund.subOrderId },
        data: {
          status: prev,
          refundRequestedPrevStatus: null,
        },
      });

      const subs = await tx.subOrder.findMany({ where: { orderId: refund.orderId }, select: { status: true } });
      const orderStatus = deriveOrderStatus(subs as any);
      await tx.order.update({ where: { id: refund.orderId }, data: { status: orderStatus } });

      return rr;
    });

    await this.audit.write({
      actorUserId: params.sellerId,
      actorRole: 'seller',
      action: AuditActions.REFUND_REJECT,
      targetType: 'RefundRequest',
      targetId: params.refundId,
      metadata: { prevStatus: prev, note: params.note ?? null },
    });

    return updated;
  }

  async adminForceRefund(params: { adminUserId: string; refundId: string; reason?: string }) {
    const refund = await this.prisma.refundRequest.findUnique({ where: { id: params.refundId } });
    if (!refund) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Refund not found' });

    const updated = await this.prisma.$transaction(async (tx) => {
      const rr = await tx.refundRequest.update({
        where: { id: refund.id },
        data: {
          approvedAmount: refund.approvedAmount ?? refund.requestedAmount,
          status: 'refunded',
        },
      });
      await tx.subOrder.update({ where: { id: refund.subOrderId }, data: { status: 'refunded' } });

      const subs = await tx.subOrder.findMany({ where: { orderId: refund.orderId }, select: { status: true } });
      const orderStatus = deriveOrderStatus(subs as any);
      await tx.order.update({ where: { id: refund.orderId }, data: { status: orderStatus } });

      return rr;
    });

    await this.audit.write({
      actorUserId: params.adminUserId,
      actorRole: 'admin',
      action: AuditActions.ADMIN_FORCE_REFUND,
      targetType: 'RefundRequest',
      targetId: params.refundId,
      metadata: { reason: params.reason ?? null },
    });

    return updated;
  }
}
