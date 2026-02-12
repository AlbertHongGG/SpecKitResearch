import request from 'supertest';
import { ActivityStatus, Role } from '@prisma/client';
import { bootstrapTestApp, clearDatabase } from './bootstrap';
import { registerAndLogin } from './test-utils';

describe('US1 /me/activities (e2e)', () => {
  const ctx: { app?: any; prisma?: any; a1?: string; a2?: string } = {};

  beforeAll(async () => {
    const { app, prisma } = await bootstrapTestApp();
    ctx.app = app;
    ctx.prisma = prisma;
  });

  beforeEach(async () => {
    await clearDatabase(ctx.prisma);

    const admin = await ctx.prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin',
        role: Role.admin,
        passwordHash: 'x',
      },
    });

    const base = {
      description: 'd',
      location: 'l',
      capacity: 2,
      registeredCount: 0,
      status: ActivityStatus.published,
      deadline: new Date(Date.now() + 60 * 60 * 1000),
      date: new Date(Date.now() + 2 * 60 * 60 * 1000),
      createdByUserId: admin.id,
    };

    ctx.a1 = (await ctx.prisma.activity.create({ data: { ...base, title: 'a1' } })).id;
    ctx.a2 = (await ctx.prisma.activity.create({ data: { ...base, title: 'a2' } })).id;
  });

  afterAll(async () => {
    await ctx.app?.close();
  });

  it('returns only active registrations', async () => {
    const token = (await registerAndLogin(ctx.app, {
      email: 'm1@example.com',
      name: 'M1',
      password: 'member1234',
    })).body.token;

    // register both
    await request(ctx.app.getHttpServer())
      .post(`/activities/${ctx.a1}/registrations`)
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post(`/activities/${ctx.a2}/registrations`)
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    // cancel one
    await request(ctx.app.getHttpServer())
      .delete(`/activities/${ctx.a1}/registrations/me`)
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    const res = await request(ctx.app.getHttpServer())
      .get('/me/activities')
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].activity.id).toBe(ctx.a2);
  });
});
