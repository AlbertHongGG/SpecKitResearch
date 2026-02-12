import { beforeEach, describe, expect, it } from 'vitest';

import { withIntegrationContext } from '../helpers';

describe('GET /reports/monthly/csv', () => {
  const ctx = withIntegrationContext();

  beforeEach(async () => {
    await ctx.resetDb();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/reports/monthly/csv?year=2026&month=2',
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns CSV with correct filename, BOM, and escaped content', async () => {
    const auth = await ctx.registerUser();
    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });
    expect(user).toBeTruthy();

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
          amount: 100,
          date: new Date('2026-02-01'),
          note: 'hello, "world"',
        },
        {
          userId: user!.id,
          categoryId: expenseCategory!.id,
          type: 'expense',
          amount: 50,
          date: new Date('2026-02-02'),
        },
      ],
    });

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/reports/monthly/csv?year=2026&month=2',
      headers: { cookie: auth.cookieHeader },
    });

    expect(res.statusCode).toBe(200);

    const contentType = String(res.headers['content-type'] ?? '');
    expect(contentType).toContain('text/csv');

    const contentDisposition = String(res.headers['content-disposition'] ?? '');
    expect(contentDisposition).toContain('transactions_2026_02.csv');

    // UTF-8 BOM for Excel compatibility
    expect(res.body.charCodeAt(0)).toBe(0xfeff);

    const text = res.body.slice(1);
    const lines = text.trimEnd().split(/\r?\n/);

    expect(lines[0]).toBe('日期,類型,類別,金額,備註');
    expect(lines).toHaveLength(3);

    // First data row should include escaped commas/quotes in note
    expect(lines[1]).toContain('2026-02-01');
    expect(lines[1]).toContain('expense');
    expect(lines[1]).toContain(expenseCategory!.name);
    expect(lines[1]).toContain('100');
    expect(lines[1]).toContain('"hello, ""world"""');
  });
});
