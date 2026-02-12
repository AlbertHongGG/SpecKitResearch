import { beforeEach, describe, expect, it } from 'vitest';

import { withIntegrationContext } from '../helpers';

describe('POST /categories', () => {
  const ctx = withIntegrationContext();

  beforeEach(async () => {
    await ctx.resetDb();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/categories',
      payload: { name: '自訂', type: 'expense' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('creates a custom category', async () => {
    const auth = await ctx.registerUser();

    const res = await ctx.app.inject({
      method: 'POST',
      url: '/categories',
      headers: auth.csrfHeaders,
      payload: { name: '娛樂', type: 'expense' },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json).toMatchObject({
      name: '娛樂',
      type: 'expense',
      isActive: true,
      isDefault: false,
    });

    const db = await ctx.prisma.category.findUnique({ where: { id: json.id } });
    expect(db).toBeTruthy();
    expect(db).toMatchObject({
      name: '娛樂',
      type: 'expense',
      isActive: true,
      isDefault: false,
    });
  });

  it('returns 400 for invalid payload', async () => {
    const auth = await ctx.registerUser();

    const res = await ctx.app.inject({
      method: 'POST',
      url: '/categories',
      headers: auth.csrfHeaders,
      payload: { name: '', type: 'expense' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 409 when name already exists for user', async () => {
    const auth = await ctx.registerUser();

    const res = await ctx.app.inject({
      method: 'POST',
      url: '/categories',
      headers: auth.csrfHeaders,
      payload: { name: '食物', type: 'expense' },
    });

    expect(res.statusCode).toBe(409);
  });
});
