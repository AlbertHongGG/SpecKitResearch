export type TransactionListItem = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  date: string; // YYYY-MM-DD
  note?: string;
};

export type DailySummary = {
  date: string; // YYYY-MM-DD
  incomeTotal: number;
  expenseTotal: number;
};

export type TransactionDateGroup = {
  date: string;
  items: TransactionListItem[];
  incomeTotal: number;
  expenseTotal: number;
};

export function groupTransactionsByDate(params: {
  items: TransactionListItem[];
  dailySummaries: DailySummary[];
}): TransactionDateGroup[] {
  const { items, dailySummaries } = params;

  const sumMap = new Map(dailySummaries.map((s) => [s.date, s]));
  const map = new Map<string, TransactionListItem[]>();

  for (const t of items) {
    const arr = map.get(t.date) ?? [];
    arr.push(t);
    map.set(t.date, arr);
  }

  return Array.from(map.entries())
    .sort((a, b) => (a[0] > b[0] ? -1 : 1))
    .map(([date, dayItems]) => {
      const sums = sumMap.get(date);
      return {
        date,
        items: dayItems,
        incomeTotal: sums?.incomeTotal ?? 0,
        expenseTotal: sums?.expenseTotal ?? 0,
      };
    });
}
