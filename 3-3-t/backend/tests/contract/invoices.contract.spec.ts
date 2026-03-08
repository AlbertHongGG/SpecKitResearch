import { describe, expect, it } from 'vitest';
import { invoiceStatusSchema } from '../../../shared/contracts/zod/index';

describe('invoices contract', () => {
  it('supports invoice statuses', () => {
    expect(invoiceStatusSchema.safeParse('Paid').success).toBe(true);
  });
});
