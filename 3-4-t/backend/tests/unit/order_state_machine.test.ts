import { describe, expect, it } from 'vitest';
import { OrderStateMachineService } from '../../src/domain/orders/order_state_machine_service';

describe('OrderStateMachineService', () => {
  const sm = new OrderStateMachineService();

  it('allows created -> payment_pending via enter_payment_page', () => {
    expect(() => sm.assertTransition({ from: 'created', to: 'payment_pending', trigger: 'enter_payment_page' })).not.toThrow();
  });

  it('rejects payment_pending -> created', () => {
    expect(() => sm.assertTransition({ from: 'payment_pending', to: 'created', trigger: 'pay' })).toThrow();
  });

  it('allows payment_pending -> paid via pay', () => {
    expect(() => sm.assertTransition({ from: 'payment_pending', to: 'paid', trigger: 'pay' })).not.toThrow();
  });
});
