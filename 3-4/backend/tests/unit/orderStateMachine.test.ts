import { describe, expect, it } from 'vitest';
import { assertCanTransition, terminalStatuses, type OrderStatus } from '../../src/domain/order/orderStateMachine';
import { ApiError } from '../../src/api/errors';

describe('orderStateMachine.assertCanTransition', () => {
  it('allows no-op transition', () => {
    expect(() => assertCanTransition('created', 'created')).not.toThrow();
    expect(() => assertCanTransition('paid', 'paid')).not.toThrow();
  });

  it('allows created -> payment_pending', () => {
    expect(() => assertCanTransition('created', 'payment_pending')).not.toThrow();
  });

  it('allows payment_pending -> terminal', () => {
    const terminals: OrderStatus[] = ['paid', 'failed', 'cancelled', 'timeout'];
    for (const t of terminals) {
      expect(() => assertCanTransition('payment_pending', t)).not.toThrow();
    }
  });

  it('rejects invalid transition with 400', () => {
    try {
      assertCanTransition('created', 'paid');
      throw new Error('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const e = err as ApiError;
      expect(e.statusCode).toBe(400);
      expect(e.code).toBe('ORDER_INVALID_TRANSITION');
      expect(e.details).toEqual({ from: 'created', to: 'paid' });
    }
  });

  it('rejects any transition out of terminal with 409', () => {
    for (const from of terminalStatuses) {
      expect(() => assertCanTransition(from, 'payment_pending')).toThrowError(ApiError);
      try {
        assertCanTransition(from, 'payment_pending');
      } catch (err) {
        const e = err as ApiError;
        expect(e.statusCode).toBe(409);
        expect(e.code).toBe('ORDER_TERMINAL_IMMUTABLE');
      }
    }
  });
});
