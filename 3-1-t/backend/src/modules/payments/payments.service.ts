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

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getPayment(user: CurrentUser | undefined, paymentId: string) {
    if (!user) throw new UnauthorizedException('Authentication required');

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment || payment.order.buyerId !== user.id) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async retryPayment(user: CurrentUser | undefined, paymentId: string) {
    const payment = await this.getPayment(user, paymentId);
    if (!['FAILED', 'CANCELLED'].includes(payment.status)) {
      throw new ConflictException('Payment is not retryable');
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PENDING', transactionId: null, occurredAt: null },
    });

    await this.auditService.write({
      actorId: user?.id,
      actorRole: 'BUYER',
      action: AuditActions.PAYMENT_RETRY,
      targetType: 'Payment',
      targetId: payment.id,
      metadata: {
        from: payment.status,
        to: updated.status,
        orderId: payment.orderId,
      },
    });

    return updated;
  }
}
