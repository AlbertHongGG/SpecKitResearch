import { ErrorCode } from '@app/contracts';

export type OrderStatus = 'created' | 'payment_pending' | 'paid' | 'failed' | 'cancelled' | 'timeout';

export type OrderTransitionTrigger = 'create' | 'enter_payment_page' | 'pay';

export class OrderStateMachineService {
  assertTransition(params: { from: OrderStatus; to: OrderStatus; trigger: OrderTransitionTrigger }) {
    const { from, to, trigger } = params;

    const allowed =
      (trigger === 'enter_payment_page' && from === 'created' && to === 'payment_pending') ||
      (trigger === 'pay' && from === 'payment_pending' && ['paid', 'failed', 'cancelled', 'timeout'].includes(to));

    if (!allowed) {
      const err = new Error('Illegal state transition') as Error & { statusCode?: number; code?: string };
      err.statusCode = 409;
      err.code = ErrorCode.CONFLICT;
      throw err;
    }
  }

  isTerminal(status: OrderStatus) {
    return status === 'paid' || status === 'failed' || status === 'cancelled' || status === 'timeout';
  }
}
