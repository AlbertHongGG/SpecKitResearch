import { conflict, badRequest } from '../../api/errors.js';

export type OrderStatus =
  | 'created'
  | 'payment_pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export const terminalStatuses: ReadonlySet<OrderStatus> = new Set([
  'paid',
  'failed',
  'cancelled',
  'timeout',
]);

export function assertCanTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) return;

  if (terminalStatuses.has(from)) {
    throw conflict('ORDER_TERMINAL_IMMUTABLE', `Order already terminal: ${from}`);
  }

  const allowed: Record<OrderStatus, OrderStatus[]> = {
    created: ['payment_pending'],
    payment_pending: ['paid', 'failed', 'cancelled', 'timeout'],
    paid: [],
    failed: [],
    cancelled: [],
    timeout: [],
  };

  if (!allowed[from].includes(to)) {
    throw badRequest('ORDER_INVALID_TRANSITION', `Invalid transition: ${from} -> ${to}`, {
      from,
      to,
    });
  }
}
