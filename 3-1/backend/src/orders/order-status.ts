import type { SubOrderStatus } from './suborder-state-machine';

export type OrderStatus = 'created' | 'paid' | 'partially_shipped' | 'completed' | 'cancelled' | 'refunded';

export function deriveOrderStatus(subOrders: { status: SubOrderStatus }[]): OrderStatus {
  const statuses = subOrders.map((s) => s.status);
  if (statuses.length === 0) return 'created';

  if (statuses.every((s) => s === 'cancelled')) return 'cancelled';
  if (statuses.every((s) => s === 'refunded')) return 'refunded';
  if (statuses.every((s) => s === 'delivered')) return 'completed';

  const anyShippedOrDelivered = statuses.some((s) => s === 'shipped' || s === 'delivered');
  const anyPaid = statuses.some((s) => s === 'paid');
  if (anyShippedOrDelivered) return 'partially_shipped';
  if (anyPaid) return 'paid';
  return 'created';
}
