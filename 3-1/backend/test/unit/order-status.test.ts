import { deriveOrderStatus } from '../../src/orders/order-status';

describe('deriveOrderStatus', () => {
  it('empty -> created', () => {
    expect(deriveOrderStatus([])).toBe('created');
  });

  it('all cancelled -> cancelled', () => {
    expect(deriveOrderStatus([{ status: 'cancelled' } as any, { status: 'cancelled' } as any])).toBe(
      'cancelled',
    );
  });

  it('all refunded -> refunded', () => {
    expect(deriveOrderStatus([{ status: 'refunded' } as any, { status: 'refunded' } as any])).toBe(
      'refunded',
    );
  });

  it('all delivered -> completed', () => {
    expect(deriveOrderStatus([{ status: 'delivered' } as any, { status: 'delivered' } as any])).toBe(
      'completed',
    );
  });

  it('any shipped/delivered -> partially_shipped', () => {
    expect(deriveOrderStatus([{ status: 'paid' } as any, { status: 'shipped' } as any])).toBe(
      'partially_shipped',
    );
  });

  it('any paid -> paid', () => {
    expect(deriveOrderStatus([{ status: 'pending_payment' } as any, { status: 'paid' } as any])).toBe(
      'paid',
    );
  });
});
