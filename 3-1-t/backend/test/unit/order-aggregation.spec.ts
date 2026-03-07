import { aggregateOrderStatus } from '../../src/modules/orders/order-aggregation';

describe('order-aggregation', () => {
  it('returns CREATED when no suborders', () => {
    expect(aggregateOrderStatus({ subOrderStatuses: [] })).toBe('CREATED');
  });

  it('returns CANCELLED when all suborders are cancelled', () => {
    expect(
      aggregateOrderStatus({
        subOrderStatuses: ['CANCELLED', 'CANCELLED'],
      }),
    ).toBe('CANCELLED');
  });

  it('returns COMPLETED when all suborders are delivered or refunded', () => {
    expect(
      aggregateOrderStatus({
        subOrderStatuses: ['DELIVERED', 'REFUNDED'],
      }),
    ).toBe('COMPLETED');
  });

  it('returns PARTIALLY_SHIPPED when any suborder enters fulfillment flow', () => {
    expect(
      aggregateOrderStatus({
        paymentStatus: 'SUCCEEDED',
        subOrderStatuses: ['PAID', 'SHIPPED'],
      }),
    ).toBe('PARTIALLY_SHIPPED');
  });

  it('returns PAID when payment succeeded but no shipment yet', () => {
    expect(
      aggregateOrderStatus({
        paymentStatus: 'SUCCEEDED',
        subOrderStatuses: ['PAID', 'PAID'],
      }),
    ).toBe('PAID');
  });
});
