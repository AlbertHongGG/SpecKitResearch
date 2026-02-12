import request from 'supertest';
import { ActivityStatus, Role } from '@prisma/client';
import { bootstrapTestApp, clearDatabase } from './bootstrap';
import { registerAndLogin } from './test-utils';

describe('US1 cancel registration (e2e)', () => {
  const ctx: { app?: any; prisma?: any; activityId?: string } = {};

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

    const activity = await ctx.prisma.activity.create({
      data: {
        title: 'published',
        description: 'd',
        location: 'l',
        capacity: 1,
        registeredCount: 0,
        status: ActivityStatus.published,
        deadline: new Date(Date.now() + 60 * 60 * 1000),
        date: new Date(Date.now() + 2 * 60 * 60 * 1000),
        createdByUserId: admin.id,
      },
    });
    ctx.activityId = activity.id;
  });

  afterAll(async () => {
    await ctx.app?.close();
  });

  it('releases seat and full->published', async () => {
    const token = (await registerAndLogin(ctx.app, {
      email: 'm1@example.com',
      name: 'M1',
      password: 'member1234',
    })).body.token;

    await request(ctx.app.getHttpServer())
      .post(`/activities/${ctx.activityId}/registrations`)
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    const res = await request(ctx.app.getHttpServer())
      .delete(`/activities/${ctx.activityId}/registrations/me`)
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.registeredCount).toBe(0);
    expect(res.body.status).toBe('published');

    const activity = await ctx.prisma.activity.findUnique({ where: { id: ctx.activityId } });
    expect(activity?.registeredCount).toBe(0);
    expect(activity?.status).toBe('published');
  });
});
