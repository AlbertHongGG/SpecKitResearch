import { assertTransition } from '../../src/orders/suborder-state-machine';

describe('SubOrder state machine', () => {
  it('rejects illegal transitions', () => {
    expect(() => assertTransition('pending_payment' as any, 'shipped' as any)).toThrow();
    expect(() => assertTransition('cancelled' as any, 'paid' as any)).toThrow();
  });
});
