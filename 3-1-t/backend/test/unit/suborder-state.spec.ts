import { BadRequestException } from '@nestjs/common';

import {
  assertSubOrderTransition,
  canTransitionSubOrder,
} from '../../src/modules/orders/suborder-state';

describe('suborder-state', () => {
  it('allows valid transition', () => {
    expect(canTransitionSubOrder('PAID', 'SHIPPED')).toBe(true);
    expect(() =>
      assertSubOrderTransition('PENDING_PAYMENT', 'PAID'),
    ).not.toThrow();
  });

  it('rejects illegal transition', () => {
    expect(canTransitionSubOrder('DELIVERED', 'PAID')).toBe(false);
    expect(() => assertSubOrderTransition('DELIVERED', 'PAID')).toThrow(
      BadRequestException,
    );
  });
});
