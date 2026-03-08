import { describe, expect, it } from 'vitest';

describe('proration calculation', () => {
  it('should calculate positive delta only', () => {
    const oldPrice = 1000;
    const newPrice = 2000;
    const proration = Math.max(newPrice - oldPrice, 0);
    expect(proration).toBe(1000);
  });
});
