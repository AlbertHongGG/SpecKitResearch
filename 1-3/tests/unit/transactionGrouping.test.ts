import { describe, expect, it } from 'vitest';
import { groupTransactionsByDate } from '@/lib/shared/transactionGrouping';

describe('groupTransactionsByDate', () => {
  it('groups by date desc and attaches daily totals', () => {
    const groups = groupTransactionsByDate({
      items: [
        { id: 't1', type: 'expense', amount: 100, categoryId: 'c1', date: '2026-02-01', note: '' },
        { id: 't2', type: 'income', amount: 300, categoryId: 'c2', date: '2026-02-01' },
        { id: 't3', type: 'expense', amount: 50, categoryId: 'c1', date: '2026-01-31' },
      ],
      dailySummaries: [
        { date: '2026-02-01', incomeTotal: 300, expenseTotal: 100 },
        { date: '2026-01-31', incomeTotal: 0, expenseTotal: 50 },
      ],
    });

    expect(groups.map((g) => g.date)).toEqual(['2026-02-01', '2026-01-31']);
    expect(groups[0].incomeTotal).toBe(300);
    expect(groups[0].expenseTotal).toBe(100);
    expect(groups[0].items.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('defaults missing daily summary totals to 0', () => {
    const groups = groupTransactionsByDate({
      items: [{ id: 't1', type: 'expense', amount: 100, categoryId: 'c1', date: '2026-02-01' }],
      dailySummaries: [],
    });

    expect(groups).toEqual([
      { date: '2026-02-01', items: [{ id: 't1', type: 'expense', amount: 100, categoryId: 'c1', date: '2026-02-01' }], incomeTotal: 0, expenseTotal: 0 },
    ]);
  });
});
