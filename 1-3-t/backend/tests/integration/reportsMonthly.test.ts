import { beforeEach, describe, expect, it } from 'vitest';

import { withIntegrationContext } from '../helpers';

describe('GET /reports/monthly', () => {
  const ctx = withIntegrationContext();

  beforeEach(async () => {
    await ctx.resetDb();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/reports/monthly?year=2026&month=2',
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns empty aggregates for a month with no transactions', async () => {
    const auth = await ctx.registerUser();

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/reports/monthly?year=2026&month=2',
      headers: { cookie: auth.cookieHeader },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();

    expect(json.year).toBe(2026);
    expect(json.month).toBe(2);
    expect(json.totals).toEqual({ totalIncome: 0, totalExpense: 0, net: 0 });
    expect(json.expenseByCategory).toEqual([]);
    expect(json.byDay).toEqual([]);
  });

  it('aggregates totals, expenseByCategory, and byDay (user-scoped)', async () => {
    const auth = await ctx.registerUser();
    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });
    expect(user).toBeTruthy();

    const expenseCategories = await ctx.prisma.category.findMany({
      where: { userId: user!.id, type: 'expense', isActive: true },
      orderBy: { name: 'asc' },
      take: 2,
    });
    expect(expenseCategories).toHaveLength(2);

    const incomeCategory = await ctx.prisma.category.findFirst({
      where: { userId: user!.id, type: 'income', isActive: true },
    });
    expect(incomeCategory).toBeTruthy();

    const [expenseA, expenseB] = expenseCategories;

    await ctx.prisma.transaction.createMany({
      data: [
        {
          userId: user!.id,
          categoryId: expenseA.id,
          type: 'expense',
          amount: 100,
          date: new Date('2026-02-01'),
          note: 'coffee',
        },
        {
          userId: user!.id,
          categoryId: expenseB.id,
          type: 'expense',
          amount: 50,
          date: new Date('2026-02-01'),
          note: 'lunch',
        },
        {
          userId: user!.id,
          categoryId: incomeCategory!.id,
          type: 'income',
          amount: 300,
          date: new Date('2026-02-02'),
          note: 'salary',
        },
        {
          userId: user!.id,
          categoryId: expenseA.id,
          type: 'expense',
          amount: 25,
          date: new Date('2026-02-03'),
        },
        {
          userId: user!.id,
          categoryId: expenseA.id,
          type: 'expense',
          amount: 999,
          date: new Date('2026-03-01'),
        },
      ],
    });

    // Another user's data should never leak into this user's report.
    const other = await ctx.registerUser({ email: `other-${Date.now()}@example.com` });
    const otherUser = await ctx.prisma.user.findUnique({ where: { email: other.email } });
    const otherExpenseCategory = await ctx.prisma.category.findFirst({
      where: { userId: otherUser!.id, type: 'expense', isActive: true },
    });

    await ctx.prisma.transaction.create({
      data: {
        userId: otherUser!.id,
        categoryId: otherExpenseCategory!.id,
        type: 'expense',
        amount: 9999,
        date: new Date('2026-02-01'),
      },
    });

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/reports/monthly?year=2026&month=2',
      headers: { cookie: auth.cookieHeader },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();

    expect(json.year).toBe(2026);
    expect(json.month).toBe(2);
    expect(json.totals.totalIncome).toBe(300);
    expect(json.totals.totalExpense).toBe(175);
    expect(json.totals.net).toBe(125);

    expect(json.expenseByCategory).toHaveLength(2);

    const first = json.expenseByCategory[0];
    const second = json.expenseByCategory[1];

    expect(first.amount).toBe(125);
    expect(first.categoryId).toBe(expenseA.id);
    expect(first.categoryName).toBe(expenseA.name);
    expect(first.percent).toBeCloseTo((125 / 175) * 100, 4);

    expect(second.amount).toBe(50);
    expect(second.categoryId).toBe(expenseB.id);
    expect(second.categoryName).toBe(expenseB.name);
    expect(second.percent).toBeCloseTo((50 / 175) * 100, 4);

    expect(json.byDay).toEqual([
      { date: '2026-02-01', incomeAmount: 0, expenseAmount: 150 },
      { date: '2026-02-02', incomeAmount: 300, expenseAmount: 0 },
      { date: '2026-02-03', incomeAmount: 0, expenseAmount: 25 },
    ]);
  });
});
