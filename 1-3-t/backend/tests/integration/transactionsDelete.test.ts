import { beforeEach, describe, expect, it } from 'vitest';

import { withIntegrationContext } from '../helpers';

describe('DELETE /transactions/{transactionId}', () => {
  const ctx = withIntegrationContext();

  beforeEach(async () => {
    await ctx.resetDb();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await ctx.app.inject({
      method: 'DELETE',
      url: `/transactions/${crypto.randomUUID()}`,
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when trying to delete another user\'s transaction', async () => {
    const auth1 = await ctx.registerUser();
    const auth2 = await ctx.registerUser();

    const user1 = await ctx.prisma.user.findUnique({ where: { email: auth1.email } });

    const expenseCategory = await ctx.prisma.category.findFirst({
      where: { userId: user1!.id, type: 'expense', isActive: true },
    });

    const created = await ctx.prisma.transaction.create({
      data: {
        userId: user1!.id,
        categoryId: expenseCategory!.id,
        type: 'expense',
        amount: 10,
        date: new Date('2026-02-01'),
        note: 'a',
      },
    });

    const res = await ctx.app.inject({
      method: 'DELETE',
      url: `/transactions/${created.id}`,
      headers: auth2.csrfHeaders,
    });

    expect(res.statusCode).toBe(403);
  });

  it('returns 404 when not found', async () => {
    const auth = await ctx.registerUser();

    const res = await ctx.app.inject({
      method: 'DELETE',
      url: `/transactions/${crypto.randomUUID()}`,
      headers: auth.csrfHeaders,
    });

    expect(res.statusCode).toBe(404);
  });

  it('deletes transaction when owner', async () => {
    const auth = await ctx.registerUser();
    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });

    const expenseCategory = await ctx.prisma.category.findFirst({
      where: { userId: user!.id, type: 'expense', isActive: true },
    });

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
      method: 'DELETE',
      url: `/transactions/${created.id}`,
      headers: auth.csrfHeaders,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    const stillThere = await ctx.prisma.transaction.findUnique({ where: { id: created.id } });
    expect(stillThere).toBeNull();
  });
});
