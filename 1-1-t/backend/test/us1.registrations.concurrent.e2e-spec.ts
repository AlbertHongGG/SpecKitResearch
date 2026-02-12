import request from 'supertest';
import { ActivityStatus, Role } from '@prisma/client';
import { bootstrapTestApp, clearDatabase } from './bootstrap';
import { registerAndLogin } from './test-utils';

describe('US1 concurrent registration (e2e)', () => {
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

  it('does not oversell last seat', async () => {
    const t1 = (await registerAndLogin(ctx.app, {
      email: 'm1@example.com',
      name: 'M1',
      password: 'member1234',
    })).body.token;

    const t2 = (await registerAndLogin(ctx.app, {
      email: 'm2@example.com',
      name: 'M2',
      password: 'member1234',
    })).body.token;

    const [r1, r2] = await Promise.allSettled([
      request(ctx.app.getHttpServer())
        .post(`/activities/${ctx.activityId}/registrations`)
        .set('authorization', `Bearer ${t1}`),
      request(ctx.app.getHttpServer())
        .post(`/activities/${ctx.activityId}/registrations`)
        .set('authorization', `Bearer ${t2}`),
    ]);

    const successes = [r1, r2].filter((r: any) => r.status === 'fulfilled' && r.value.status === 200);
    const conflicts = [r1, r2].filter((r: any) => r.status === 'fulfilled' && r.value.status === 409);

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].value.body.code).toBe('FULL');

    const activity = await ctx.prisma.activity.findUnique({ where: { id: ctx.activityId } });
    expect(activity?.registeredCount).toBe(1);
    expect(activity?.status).toBe('full');

    const regs = await ctx.prisma.registration.findMany({ where: { activityId: ctx.activityId, canceledAt: null } });
    expect(regs.length).toBe(1);
  });
});
