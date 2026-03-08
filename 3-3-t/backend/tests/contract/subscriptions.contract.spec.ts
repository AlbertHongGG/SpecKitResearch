import { describe, expect, it } from 'vitest';
import { subscriptionStatusSchema } from '../../../shared/contracts/zod/index';

describe('subscriptions contract', () => {
  it('supports defined status values', () => {
    expect(subscriptionStatusSchema.safeParse('Active').success).toBe(true);
  });
});
