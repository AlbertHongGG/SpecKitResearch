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
import type { RefundRequestBody } from './refunds.schemas';

const REFUND_WINDOW_DAYS = 7;

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createRefundRequest(
    user: CurrentUser | undefined,
    body: RefundRequestBody,
  ) {
    if (!user) throw new UnauthorizedException('Authentication required');

    const subOrder = await this.prisma.subOrder.findUnique({
      where: { id: body.subOrderId },
      include: { order: true },
    });
    if (!subOrder || subOrder.order.buyerId !== user.id) {
      throw new NotFoundException('SubOrder not found');
    }

    if (subOrder.status !== 'DELIVERED') {
      throw new ConflictException(
        'Refund is only available for delivered orders',
      );
    }

    const daysFromDelivered =
      (Date.now() - new Date(subOrder.updatedAt).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysFromDelivered > REFUND_WINDOW_DAYS) {
      throw new ConflictException('Refund window exceeded');
    }

    const created = await this.prisma.refundRequest.create({
      data: {
        subOrderId: subOrder.id,
        buyerId: user.id,
        reason: body.reason,
        requestedCents: body.requestedCents,
        prevSubOrderStatus: subOrder.status,
        status: 'REQUESTED',
      },
    });

    await this.prisma.subOrder.update({
      where: { id: subOrder.id },
      data: { prevStatus: subOrder.status, status: 'REFUND_REQUESTED' },
    });

    await this.auditService.write({
      actorId: user.id,
      actorRole: 'BUYER',
      action: AuditActions.REFUND_REQUEST_CREATE,
      targetType: 'RefundRequest',
      targetId: created.id,
      metadata: {
        subOrderId: subOrder.id,
        requestedCents: body.requestedCents,
      },
    });

    return created;
  }
}
