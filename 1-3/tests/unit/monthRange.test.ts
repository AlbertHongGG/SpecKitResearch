import { describe, expect, it } from 'vitest';
import { getMonthDateKeysOrThrow } from '@/lib/server/queries/monthRange';

describe('getMonthDateKeysOrThrow', () => {
  it('returns [from,to) date keys for a given month', () => {
    const r = getMonthDateKeysOrThrow(2026, 2);
    expect(r).toEqual({ from: '2026-02-01', to: '2026-03-01' });
  });
});
