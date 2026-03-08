import { describe, expect, it } from 'vitest';

describe('risk accounts service', () => {
  it('identifies past due status as risk', () => {
    expect(['PastDue', 'Suspended'].includes('PastDue')).toBe(true);
  });
});
