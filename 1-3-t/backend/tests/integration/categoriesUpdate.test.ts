import { beforeEach, describe, expect, it } from 'vitest';

import { withIntegrationContext } from '../helpers';

describe('PUT /categories/{categoryId}', () => {
  const ctx = withIntegrationContext();

  beforeEach(async () => {
    await ctx.resetDb();
  });

  it('returns 401 when unauthenticated', async () => {
    const id = crypto.randomUUID();
    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/categories/${id}`,
      payload: { name: 'x', type: 'expense' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('updates a category', async () => {
    const auth = await ctx.registerUser();
    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });

    const existing = await ctx.prisma.category.findFirst({ where: { userId: user!.id } });
    expect(existing).toBeTruthy();

    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/categories/${existing!.id}`,
      headers: auth.csrfHeaders,
      payload: { name: '飲食', type: 'both' },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json).toMatchObject({
      id: existing!.id,
      name: '飲食',
      type: 'both',
    });
  });

  it("returns 404 when updating another user's category", async () => {
    const auth1 = await ctx.registerUser({ email: 'u1@example.com' });
    const user1 = await ctx.prisma.user.findUnique({ where: { email: auth1.email } });

    const category1 = await ctx.prisma.category.findFirst({ where: { userId: user1!.id } });
    expect(category1).toBeTruthy();

    const auth2 = await ctx.registerUser({ email: 'u2@example.com' });

    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/categories/${category1!.id}`,
      headers: auth2.csrfHeaders,
      payload: { name: 'x', type: 'expense' },
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when category not found', async () => {
    const auth = await ctx.registerUser();

    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/categories/${crypto.randomUUID()}`,
      headers: auth.csrfHeaders,
      payload: { name: 'x', type: 'expense' },
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 409 when renaming to a duplicate name', async () => {
    const auth = await ctx.registerUser();
    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });

    const createdA = await ctx.prisma.category.create({
      data: {
        userId: user!.id,
        name: 'A',
        type: 'expense',
        isActive: true,
        isDefault: false,
      },
    });

    const createdB = await ctx.prisma.category.create({
      data: {
        userId: user!.id,
        name: 'B',
        type: 'expense',
        isActive: true,
        isDefault: false,
      },
    });

    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/categories/${createdA.id}`,
      headers: auth.csrfHeaders,
      payload: { name: createdB.name, type: 'expense' },
    });

    expect(res.statusCode).toBe(409);
  });
});
