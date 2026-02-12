import request from 'supertest';
import { bootstrapTestApp, clearDatabase } from './bootstrap';
import { ActivityStatus, Role } from '@prisma/client';

describe('US1 registration requires auth (e2e)', () => {
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
        capacity: 2,
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

  it('returns 401 when unauthenticated', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`/activities/${ctx.activityId}/registrations`)
      .expect(401);

    expect(res.body.code).toBe('AUTH_REQUIRED');
  });
});
