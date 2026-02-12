import { beforeEach, describe, expect, it } from 'vitest';

import { withIntegrationContext } from '../helpers';

describe('POST /transactions', () => {
  const ctx = withIntegrationContext();

  beforeEach(async () => {
    await ctx.resetDb();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/transactions',
      payload: { type: 'expense', amount: 1, categoryId: crypto.randomUUID(), date: '2026-02-01' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('creates transaction for active compatible category', async () => {
    const auth = await ctx.registerUser();

    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });
    const category = await ctx.prisma.category.findFirst({
      where: { userId: user!.id, type: 'expense', isActive: true },
    });
    expect(category).toBeTruthy();

    const res = await ctx.app.inject({
      method: 'POST',
      url: '/transactions',
      headers: auth.csrfHeaders,
      payload: {
        type: 'expense',
        amount: 120,
        categoryId: category!.id,
        date: '2026-02-01',
        note: '午餐',
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json).toMatchObject({
      type: 'expense',
      amount: 120,
      categoryId: category!.id,
      categoryName: category!.name,
      date: '2026-02-01',
      note: '午餐',
    });
  });

  it('returns 400 for invalid payload', async () => {
    const auth = await ctx.registerUser();

    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });
    const category = await ctx.prisma.category.findFirst({ where: { userId: user!.id, isActive: true } });

    const res = await ctx.app.inject({
      method: 'POST',
      url: '/transactions',
      headers: auth.csrfHeaders,
      payload: {
        type: 'expense',
        amount: 0,
        categoryId: category!.id,
        date: 'not-a-date',
        note: 'x'.repeat(201),
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when category is inactive or incompatible', async () => {
    const auth = await ctx.registerUser();

    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });

    const incomeCategory = await ctx.prisma.category.findFirst({
      where: { userId: user!.id, type: 'income', isActive: true },
    });
    expect(incomeCategory).toBeTruthy();

    const inactiveExpense = await ctx.prisma.category.findFirst({
      where: { userId: user!.id, type: 'expense', isActive: true },
    });
    expect(inactiveExpense).toBeTruthy();

    await ctx.prisma.category.update({
      where: { id: inactiveExpense!.id },
      data: { isActive: false },
    });

    const res1 = await ctx.app.inject({
      method: 'POST',
      url: '/transactions',
      headers: auth.csrfHeaders,
      payload: {
        type: 'expense',
        amount: 10,
        categoryId: incomeCategory!.id,
        date: '2026-02-01',
      },
    });

    expect(res1.statusCode).toBe(404);

    const res2 = await ctx.app.inject({
      method: 'POST',
      url: '/transactions',
      headers: auth.csrfHeaders,
      payload: {
        type: 'expense',
        amount: 10,
        categoryId: inactiveExpense!.id,
        date: '2026-02-01',
      },
    });

    expect(res2.statusCode).toBe(404);
  });
});
