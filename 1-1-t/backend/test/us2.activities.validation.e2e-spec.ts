import request from 'supertest';
import { Role } from '@prisma/client';
import { bootstrapTestApp, clearDatabase } from './bootstrap';
import { createUserWithRole, loginUser } from './test-utils';

describe('US2 activity validation (e2e)', () => {
  const ctx: { app?: any; prisma?: any } = {};

  beforeAll(async () => {
    const { app, prisma } = await bootstrapTestApp();
    ctx.app = app;
    ctx.prisma = prisma;
  });

  beforeEach(async () => {
    await clearDatabase(ctx.prisma);

    await createUserWithRole(ctx.prisma, {
      email: 'admin@example.com',
      name: 'Admin',
      password: 'admin1234',
      role: Role.admin,
    });
  });

  afterAll(async () => {
    await ctx.app?.close();
  });

  it('rejects date <= deadline with 422', async () => {
    const token = (
      await loginUser(ctx.app, {
        email: 'admin@example.com',
        password: 'admin1234',
      })
    ).body.token;

    const now = Date.now();

    const res = await request(ctx.app.getHttpServer())
      .post('/admin/activities')
      .set('authorization', `Bearer ${token}`)
      .send({
        title: 'Bad',
        description: 'd',
        location: 'l',
        capacity: 10,
        deadline: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
        date: new Date(now + 60 * 60 * 1000).toISOString(),
      })
      .expect(422);

    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
