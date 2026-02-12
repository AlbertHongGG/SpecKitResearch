import type {
  OrderStatus,
  PaymentStatus,
  SubOrderStatus,
} from '@prisma/client';

export function aggregateOrderStatus(params: {
  paymentStatus?: PaymentStatus;
  subOrderStatuses: SubOrderStatus[];
}): OrderStatus {
  const { paymentStatus, subOrderStatuses } = params;

  if (subOrderStatuses.length === 0) return 'CREATED';

  const all = (pred: (s: SubOrderStatus) => boolean) =>
    subOrderStatuses.every(pred);
  const any = (pred: (s: SubOrderStatus) => boolean) =>
    subOrderStatuses.some(pred);

  if (all((s) => s === 'CANCELLED')) return 'CANCELLED';
  if (all((s) => s === 'REFUNDED')) return 'REFUNDED';
  if (all((s) => s === 'DELIVERED' || s === 'REFUNDED')) return 'COMPLETED';

  if (
    any(
      (s) =>
        s === 'SHIPPED' ||
        s === 'DELIVERED' ||
        s === 'REFUND_REQUESTED' ||
        s === 'REFUNDED',
    )
  ) {
    return 'PARTIALLY_SHIPPED';
  }

  if (paymentStatus === 'SUCCEEDED' || all((s) => s !== 'PENDING_PAYMENT')) {
    return 'PAID';
  }

  return 'CREATED';
}
