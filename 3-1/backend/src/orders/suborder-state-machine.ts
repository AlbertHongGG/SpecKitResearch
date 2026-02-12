export type SubOrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refund_requested'
  | 'refunded';

const allowed: Record<SubOrderStatus, SubOrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['shipped', 'refund_requested'],
  shipped: ['delivered', 'refund_requested'],
  delivered: ['refund_requested'],
  cancelled: [],
  refund_requested: ['refunded', 'paid', 'shipped', 'delivered'],
  refunded: [],
};

export function canTransition(from: SubOrderStatus, to: SubOrderStatus) {
  return allowed[from]?.includes(to) ?? false;
}

export function assertTransition(from: SubOrderStatus, to: SubOrderStatus) {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal SubOrder transition: ${from} -> ${to}`);
  }
}
