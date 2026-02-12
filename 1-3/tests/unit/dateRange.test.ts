import { describe, expect, it } from 'vitest';
import { getMonthRange, isValidMonth, toDateKey } from '@/lib/shared/dateRange';

describe('dateRange', () => {
  it('getMonthRange returns [start, end) in UTC month', () => {
    const { start, end } = getMonthRange(2026, 2);

    expect(start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('getMonthRange handles year boundary', () => {
    const { start, end } = getMonthRange(2026, 12);
    expect(start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('toDateKey uses UTC components', () => {
    const date = new Date('2026-02-01T23:59:59.000Z');
    expect(toDateKey(date)).toBe('2026-02-01');
  });

  it('isValidMonth validates bounds', () => {
    expect(isValidMonth(2026, 1)).toBe(true);
    expect(isValidMonth(1999, 1)).toBe(false);
    expect(isValidMonth(2026, 0)).toBe(false);
    expect(isValidMonth(2026, 13)).toBe(false);
  });
});
