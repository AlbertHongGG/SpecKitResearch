import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { AuditActions } from '../../../common/audit/audit-actions';
import { AuditService } from '../../../common/audit/audit.service';
import type { CurrentUser } from '../../../auth/types';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SellerRefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async ownedRefund(user: CurrentUser | undefined, id: string) {
    if (!user) throw new UnauthorizedException('Authentication required');
    const req = await this.prisma.refundRequest.findUnique({
      where: { id },
      include: { subOrder: true },
    });
    if (!req || req.subOrder.sellerId !== user.id)
      throw new NotFoundException('Refund not found');
    return req;
  }

  async approve(user: CurrentUser | undefined, id: string) {
    const req = await this.ownedRefund(user, id);
    const updated = await this.prisma.refundRequest.update({
      where: { id: req.id },
      data: { status: 'APPROVED', approvedCents: req.requestedCents },
    });
    await this.auditService.write({
      actorId: user?.id,
      actorRole: 'SELLER',
      action: AuditActions.SELLER_APPLICATION_DECIDE,
      targetType: 'RefundRequest',
      targetId: id,
      metadata: { decision: 'approve' },
    });
    return updated;
  }

  async reject(user: CurrentUser | undefined, id: string) {
    const req = await this.ownedRefund(user, id);
    await this.prisma.$transaction([
      this.prisma.refundRequest.update({
        where: { id: req.id },
        data: { status: 'REJECTED' },
      }),
      this.prisma.subOrder.update({
        where: { id: req.subOrderId },
        data: {
          status: req.prevSubOrderStatus,
          prevStatus: req.prevSubOrderStatus,
        },
      }),
    ]);
    await this.auditService.write({
      actorId: user?.id,
      actorRole: 'SELLER',
      action: AuditActions.SELLER_APPLICATION_DECIDE,
      targetType: 'RefundRequest',
      targetId: id,
      metadata: { decision: 'reject', restored: req.prevSubOrderStatus },
    });
    return { ok: true };
  }
}
