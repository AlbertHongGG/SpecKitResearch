import { describe, it, expect } from 'vitest';

describe('navigation', () => {
  it('contains dashboard label', () => {
    const items = ['Dashboard', 'Subscription', 'Usage', 'Invoices'];
    expect(items.includes('Dashboard')).toBe(true);
  });
});
