import { beforeEach, describe, expect, it } from 'vitest';

import { withIntegrationContext } from '../helpers';

describe('GET /categories', () => {
  const ctx = withIntegrationContext();

  beforeEach(async () => {
    await ctx.resetDb();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/categories' });
    expect(res.statusCode).toBe(401);
  });

  it('returns items including inactive when includeInactive=true (default)', async () => {
    const auth = await ctx.registerUser();

    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });
    expect(user).toBeTruthy();

    const anyCategory = await ctx.prisma.category.findFirst({ where: { userId: user!.id } });
    expect(anyCategory).toBeTruthy();

    await ctx.prisma.category.update({
      where: { id: anyCategory!.id },
      data: { isActive: false },
    });

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/categories',
      headers: {
        cookie: auth.cookieHeader,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(Array.isArray(json.items)).toBe(true);
    // should include inactive item
    expect(json.items.some((c: any) => c.id === anyCategory!.id)).toBe(true);
  });

  it('filters out inactive when includeInactive=false', async () => {
    const auth = await ctx.registerUser();

    const user = await ctx.prisma.user.findUnique({ where: { email: auth.email } });
    const anyCategory = await ctx.prisma.category.findFirst({ where: { userId: user!.id } });

    await ctx.prisma.category.update({
      where: { id: anyCategory!.id },
      data: { isActive: false },
    });

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/categories?includeInactive=false',
      headers: {
        cookie: auth.cookieHeader,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.items.some((c: any) => c.id === anyCategory!.id)).toBe(false);
  });
});
