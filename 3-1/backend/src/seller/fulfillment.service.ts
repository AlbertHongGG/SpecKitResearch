import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { ErrorCodes } from '../shared/http/error-codes';
import { assertTransition, type SubOrderStatus } from '../orders/suborder-state-machine';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit.actions';

@Injectable()
export class FulfillmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async ship(sellerId: string, subOrderId: string, metadata?: { carrier?: string; trackingNo?: string }) {
    const sub = await this.prisma.subOrder.findUnique({ where: { id: subOrderId } });
    if (!sub) throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'SubOrder not found' });
    if (sub.sellerId !== sellerId) {
      throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Forbidden' });
    }

    try {
      assertTransition(sub.status as SubOrderStatus, 'shipped');
    } catch {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Invalid transition' });
    }

    const updated = await this.prisma.subOrder.update({
      where: { id: subOrderId },
      data: { status: 'shipped' },
    });

    await this.audit.write({
      actorUserId: sellerId,
      actorRole: 'seller',
      action: AuditActions.SUBORDER_SHIP,
      targetType: 'SubOrder',
      targetId: subOrderId,
      metadata,
    });

    return updated;
  }
}
