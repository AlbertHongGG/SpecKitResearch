import { beforeEach, describe, expect, it } from 'vitest';

import { withIntegrationContext } from '../helpers';

describe('PATCH /categories/{categoryId}/active', () => {
  const ctx = withIntegrationContext();

  beforeEach(async () => {
    await ctx.resetDb();
  });

  it('returns 401 when unauthenticated', async () => {
    const id = crypto.randomUUID();
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/categories/${id}/active`,
      payload: { isActive: false },
    });

    expect(res.statusCode).toBe(401);
  });

  it('toggles category active', async () => {
    const auth = await ctx.registerUser();
    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });

    const category = await ctx.prisma.category.findFirst({ where: { userId: user!.id } });
    expect(category).toBeTruthy();

    const res1 = await ctx.app.inject({
      method: 'PATCH',
      url: `/categories/${category!.id}/active`,
      headers: auth.csrfHeaders,
      payload: { isActive: false },
    });

    expect(res1.statusCode).toBe(200);
    expect(res1.json()).toMatchObject({ id: category!.id, isActive: false });

    const res2 = await ctx.app.inject({
      method: 'PATCH',
      url: `/categories/${category!.id}/active`,
      headers: auth.csrfHeaders,
      payload: { isActive: true },
    });

    expect(res2.statusCode).toBe(200);
    expect(res2.json()).toMatchObject({ id: category!.id, isActive: true });
  });

  it("returns 404 when toggling another user's category", async () => {
    const auth1 = await ctx.registerUser({ email: 'u1@example.com' });
    const user1 = await ctx.prisma.user.findUnique({ where: { email: auth1.email } });

    const category1 = await ctx.prisma.category.findFirst({ where: { userId: user1!.id } });
    expect(category1).toBeTruthy();

    const auth2 = await ctx.registerUser({ email: 'u2@example.com' });

    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/categories/${category1!.id}/active`,
      headers: auth2.csrfHeaders,
      payload: { isActive: false },
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when category not found', async () => {
    const auth = await ctx.registerUser();

    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/categories/${crypto.randomUUID()}/active`,
      headers: auth.csrfHeaders,
      payload: { isActive: false },
    });

    expect(res.statusCode).toBe(404);
  });
});
