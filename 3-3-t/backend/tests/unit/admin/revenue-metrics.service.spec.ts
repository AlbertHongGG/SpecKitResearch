import { describe, expect, it } from 'vitest';

describe('revenue metrics service', () => {
  it('calculates churn', () => {
    const canceled = 2;
    const total = 10;
    expect(canceled / total).toBe(0.2);
  });
});
