import { describe, expect, it } from 'vitest';
import { formatAmount } from '@/lib/shared/money';

describe('money', () => {
  it('formats positive numbers with zh-TW separators', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(1234)).toBe('1,234');
  });

  it('formats negative numbers with a leading minus', () => {
    expect(formatAmount(-1234)).toBe('-1,234');
  });
});
