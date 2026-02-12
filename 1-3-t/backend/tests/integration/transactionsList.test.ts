import { beforeEach, describe, expect, it } from 'vitest';

import { withIntegrationContext } from '../helpers';

describe('GET /transactions', () => {
  const ctx = withIntegrationContext();

  beforeEach(async () => {
    await ctx.resetDb();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/transactions' });
    expect(res.statusCode).toBe(401);
  });

  it('paginates and filters by date', async () => {
    const auth = await ctx.registerUser();
    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });

    const expenseCategory = await ctx.prisma.category.findFirst({
      where: { userId: user!.id, type: 'expense', isActive: true },
    });
    expect(expenseCategory).toBeTruthy();

    await ctx.prisma.transaction.createMany({
      data: [
        {
          userId: user!.id,
          categoryId: expenseCategory!.id,
          type: 'expense',
          amount: 10,
          date: new Date('2026-02-01'),
          note: 'a',
        },
        {
          userId: user!.id,
          categoryId: expenseCategory!.id,
          type: 'expense',
          amount: 20,
          date: new Date('2026-02-02'),
          note: 'b',
        },
        {
          userId: user!.id,
          categoryId: expenseCategory!.id,
          type: 'expense',
          amount: 30,
          date: new Date('2026-02-03'),
          note: 'c',
        },
      ],
    });

    const resPage1 = await ctx.app.inject({
      method: 'GET',
      url: '/transactions?page=1&pageSize=2',
      headers: { cookie: auth.cookieHeader },
    });

    expect(resPage1.statusCode).toBe(200);
    const json1 = resPage1.json();
    expect(json1.total).toBe(3);
    expect(json1.items).toHaveLength(2);

    const resFiltered = await ctx.app.inject({
      method: 'GET',
      url: '/transactions?fromDate=2026-02-02&toDate=2026-02-02',
      headers: { cookie: auth.cookieHeader },
    });

    expect(resFiltered.statusCode).toBe(200);
    const json2 = resFiltered.json();
    expect(json2.total).toBe(1);
    expect(json2.items).toHaveLength(1);
    expect(json2.items[0].date).toBe('2026-02-02');
  });
});
