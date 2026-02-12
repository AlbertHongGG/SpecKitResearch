import request from 'supertest';
import { Role } from '@prisma/client';
import { bootstrapTestApp, clearDatabase } from './bootstrap';
import { createUserWithRole, loginUser, registerAndLogin } from './test-utils';

describe('US3 admin registrations list (default excludes cancelled) (e2e)', () => {
  const ctx: { app?: any; prisma?: any } = {};

  beforeAll(async () => {
    const { app, prisma } = await bootstrapTestApp();
    ctx.app = app;
    ctx.prisma = prisma;
  });

  beforeEach(async () => {
    await clearDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app?.close();
  });

  it('returns only active registrations by default', async () => {
    await createUserWithRole(ctx.prisma, {
      email: 'admin@example.com',
      name: 'Admin',
      password: 'password123',
      role: Role.admin,
    });

    const adminLogin = await loginUser(ctx.app, {
      email: 'admin@example.com',
      password: 'password123',
    });
    const adminToken = adminLogin.body.token as string;

    const memberA = await registerAndLogin(ctx.app, {
      email: 'a@example.com',
      name: 'A',
      password: 'password123',
    });
    const tokenA = memberA.body.token as string;

    const memberB = await registerAndLogin(ctx.app, {
      email: 'b@example.com',
      name: 'B',
      password: 'password123',
    });
    const tokenB = memberB.body.token as string;

    const activity = await ctx.prisma.activity.create({
      data: {
        title: 'A1',
        description: 'D',
        location: 'L',
        capacity: 10,
        registeredCount: 0,
        status: 'published',
        deadline: new Date(Date.now() + 60 * 60 * 1000),
        date: new Date(Date.now() + 2 * 60 * 60 * 1000),
        createdByUserId: (await ctx.prisma.user.findFirstOrThrow({ where: { email: 'admin@example.com' } })).id,
      },
    });

    // A registers and stays active
    await request(ctx.app.getHttpServer())
      .post(`/activities/${activity.id}/registrations`)
      .set('authorization', `Bearer ${tokenA}`)
      .expect(200);

    // B registers then cancels
    await request(ctx.app.getHttpServer())
      .post(`/activities/${activity.id}/registrations`)
      .set('authorization', `Bearer ${tokenB}`)
      .expect(200);

    await request(ctx.app.getHttpServer())
      .delete(`/activities/${activity.id}/registrations/me`)
      .set('authorization', `Bearer ${tokenB}`)
      .expect(200);

    const res = await request(ctx.app.getHttpServer())
      .get(`/admin/activities/${activity.id}/registrations`)
      .set('authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      email: 'a@example.com',
      name: 'A',
    });
    expect(res.body.items[0].canceledAt).toBeNull();
  });
});
