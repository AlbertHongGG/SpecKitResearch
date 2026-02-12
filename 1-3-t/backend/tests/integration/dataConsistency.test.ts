import { beforeEach, describe, expect, it } from 'vitest';

import { withIntegrationContext } from '../helpers';

type Totals = { income: number; expense: number };

type CsvRow = {
  date: string;
  type: 'income' | 'expense';
  categoryName: string;
  amount: number;
  note: string;
};

function stripBom(text: string) {
  return text.startsWith('\ufeff') ? text.slice(1) : text;
}

function parseCsvLine(line: string) {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === ',') {
      out.push(cur);
      cur = '';
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

function sumTotalsFromItems(items: Array<{ type: 'income' | 'expense'; amount: number }>): Totals {
  return items.reduce<Totals>(
    (acc, item) => {
      if (item.type === 'income') acc.income += item.amount;
      else acc.expense += item.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );
}

describe('Data consistency invariants', () => {
  const ctx = withIntegrationContext();

  beforeEach(async () => {
    await ctx.resetDb();
  });

  it('keeps list, monthly report, and monthly CSV consistent for the same month', async () => {
    const auth = await ctx.registerUser();
    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });
    expect(user).toBeTruthy();

    const incomeCategory = await ctx.prisma.category.findFirst({
      where: { userId: user!.id, type: 'income', isActive: true },
      select: { id: true, name: true },
    });
    const expenseCategory = await ctx.prisma.category.findFirst({
      where: { userId: user!.id, type: 'expense', isActive: true },
      select: { id: true, name: true },
    });

    expect(incomeCategory).toBeTruthy();
    expect(expenseCategory).toBeTruthy();

    await ctx.prisma.transaction.createMany({
      data: [
        {
          userId: user!.id,
          categoryId: expenseCategory!.id,
          type: 'expense',
          amount: 120,
          date: new Date('2026-02-01'),
          note: 'lunch, "extra"',
        },
        {
          userId: user!.id,
          categoryId: incomeCategory!.id,
          type: 'income',
          amount: 500,
          date: new Date('2026-02-03'),
          note: 'salary',
        },
        {
          userId: user!.id,
          categoryId: expenseCategory!.id,
          type: 'expense',
          amount: 80,
          date: new Date('2026-02-03'),
          note: 'coffee',
        },
        // Out of month should not be included
        {
          userId: user!.id,
          categoryId: expenseCategory!.id,
          type: 'expense',
          amount: 999,
          date: new Date('2026-03-01'),
        },
      ],
    });

    const listRes = await ctx.app.inject({
      method: 'GET',
      url: '/transactions?page=1&pageSize=100&fromDate=2026-02-01&toDate=2026-02-28',
      headers: { cookie: auth.cookieHeader },
    });

    expect(listRes.statusCode).toBe(200);
    const listJson = listRes.json() as {
      items: Array<{
        id: string;
        type: 'income' | 'expense';
        amount: number;
        categoryId: string;
        categoryName: string;
        date: string;
        note: string | null;
      }>;
      total: number;
    };

    expect(listJson.total).toBe(3);

    const listTotals = sumTotalsFromItems(listJson.items);

    const reportRes = await ctx.app.inject({
      method: 'GET',
      url: '/reports/monthly?year=2026&month=2',
      headers: { cookie: auth.cookieHeader },
    });

    expect(reportRes.statusCode).toBe(200);
    const reportJson = reportRes.json() as {
      totals: { totalIncome: number; totalExpense: number; net: number };
      expenseByCategory: Array<{ categoryId: string; amount: number }>;
      byDay: Array<{ date: string; incomeAmount: number; expenseAmount: number }>;
    };

    expect(reportJson.totals.totalIncome).toBe(listTotals.income);
    expect(reportJson.totals.totalExpense).toBe(listTotals.expense);
    expect(reportJson.totals.net).toBe(listTotals.income - listTotals.expense);

    // byDay matches list grouping
    const expectedByDay = new Map<string, Totals>();
    for (const item of listJson.items) {
      const cur = expectedByDay.get(item.date) ?? { income: 0, expense: 0 };
      if (item.type === 'income') cur.income += item.amount;
      else cur.expense += item.amount;
      expectedByDay.set(item.date, cur);
    }

    expect(reportJson.byDay).toHaveLength(expectedByDay.size);
    for (const row of reportJson.byDay) {
      const t = expectedByDay.get(row.date);
      expect(t).toBeTruthy();
      expect(row.incomeAmount).toBe(t!.income);
      expect(row.expenseAmount).toBe(t!.expense);
    }

    // expenseByCategory sums match expense total
    const expenseByCategorySum = reportJson.expenseByCategory.reduce((acc, x) => acc + x.amount, 0);
    expect(expenseByCategorySum).toBe(listTotals.expense);

    const csvRes = await ctx.app.inject({
      method: 'GET',
      url: '/reports/monthly/csv?year=2026&month=2',
      headers: { cookie: auth.cookieHeader },
    });

    expect(csvRes.statusCode).toBe(200);
    const csvText = stripBom(csvRes.body);
    const lines = csvText.trimEnd().split(/\r\n/);

    expect(lines[0]).toBe('日期,類型,類別,金額,備註');

    const csvRows: CsvRow[] = [];
    for (const line of lines.slice(1)) {
      if (!line) continue;
      const [date, type, categoryName, amountStr, note] = parseCsvLine(line);
      csvRows.push({
        date,
        type: type as 'income' | 'expense',
        categoryName,
        amount: Number(amountStr),
        note,
      });
    }

    expect(csvRows).toHaveLength(listJson.items.length);

    const csvTotals = sumTotalsFromItems(csvRows);
    expect(csvTotals.income).toBe(listTotals.income);
    expect(csvTotals.expense).toBe(listTotals.expense);
  });
});
