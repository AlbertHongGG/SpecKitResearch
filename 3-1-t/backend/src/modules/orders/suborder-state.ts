import { BadRequestException } from '@nestjs/common';
import type { SubOrderStatus } from '@prisma/client';

export const subOrderTransitions: Record<SubOrderStatus, SubOrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUND_REQUESTED'],
  CANCELLED: [],
  REFUND_REQUESTED: ['REFUNDED'],
  REFUNDED: [],
};

export function canTransitionSubOrder(
  from: SubOrderStatus,
  to: SubOrderStatus,
): boolean {
  return subOrderTransitions[from]?.includes(to) ?? false;
}

export function assertSubOrderTransition(
  from: SubOrderStatus,
  to: SubOrderStatus,
) {
  if (!canTransitionSubOrder(from, to)) {
    throw new BadRequestException(
      `Illegal SubOrder transition: ${from} -> ${to}`,
    );
  }
}
