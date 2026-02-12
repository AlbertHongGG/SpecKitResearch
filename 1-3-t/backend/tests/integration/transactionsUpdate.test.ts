import { beforeEach, describe, expect, it } from 'vitest';

import { withIntegrationContext } from '../helpers';

describe('PUT /transactions/{transactionId}', () => {
  const ctx = withIntegrationContext();

  beforeEach(async () => {
    await ctx.resetDb();
  });

  it('returns 401 when unauthenticated', async () => {
    const id = crypto.randomUUID();
    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/transactions/${id}`,
      payload: {
        type: 'expense',
        amount: 1,
        categoryId: crypto.randomUUID(),
        date: '2026-02-01',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('updates transaction (date move)', async () => {
    const auth = await ctx.registerUser();
    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });

    const expenseCategory = await ctx.prisma.category.findFirst({
      where: { userId: user!.id, type: 'expense', isActive: true },
    });
    expect(expenseCategory).toBeTruthy();

    const created = await ctx.prisma.transaction.create({
      data: {
        userId: user!.id,
        categoryId: expenseCategory!.id,
        type: 'expense',
        amount: 10,
        date: new Date('2026-02-01'),
        note: 'a',
      },
    });

    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/transactions/${created.id}`,
      headers: auth.csrfHeaders,
      payload: {
        type: 'expense',
        amount: 20,
        categoryId: expenseCategory!.id,
        date: '2026-02-02',
        note: 'b',
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json).toMatchObject({
      id: created.id,
      type: 'expense',
      amount: 20,
      categoryId: expenseCategory!.id,
      categoryName: expenseCategory!.name,
      date: '2026-02-02',
      note: 'b',
    });
  });

  it("returns 404 when updating another user's transaction", async () => {
    const auth1 = await ctx.registerUser({ email: 'u1@example.com' });
    const user1 = await ctx.prisma.user.findUnique({ where: { email: auth1.email } });

    const category1 = await ctx.prisma.category.findFirst({
      where: { userId: user1!.id, type: 'expense', isActive: true },
    });
    expect(category1).toBeTruthy();

    const created = await ctx.prisma.transaction.create({
      data: {
        userId: user1!.id,
        categoryId: category1!.id,
        type: 'expense',
        amount: 10,
        date: new Date('2026-02-01'),
        note: 'a',
      },
    });

    const auth2 = await ctx.registerUser({ email: 'u2@example.com' });
    const user2 = await ctx.prisma.user.findUnique({ where: { email: auth2.email } });

    const category2 = await ctx.prisma.category.findFirst({
      where: { userId: user2!.id, type: 'expense', isActive: true },
    });
    expect(category2).toBeTruthy();

    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/transactions/${created.id}`,
      headers: auth2.csrfHeaders,
      payload: {
        type: 'expense',
        amount: 20,
        categoryId: category2!.id,
        date: '2026-02-02',
      },
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when transaction not found', async () => {
    const auth = await ctx.registerUser();

    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/transactions/${crypto.randomUUID()}`,
      headers: auth.csrfHeaders,
      payload: {
        type: 'expense',
        amount: 20,
        categoryId: crypto.randomUUID(),
        date: '2026-02-02',
      },
    });

    expect(res.statusCode).toBe(404);
  });
});
