import request from 'supertest';
import { bootstrapTestApp, clearDatabase } from './bootstrap';
import { ActivityStatus, Role } from '@prisma/client';

describe('US1 /activities list (e2e)', () => {
  const ctx: { app?: any; prisma?: any } = {};

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
      title: 't',
      description: 'd',
      location: 'l',
      capacity: 10,
      registeredCount: 0,
      deadline: new Date(Date.now() + 60 * 60 * 1000),
      date: new Date(Date.now() + 2 * 60 * 60 * 1000),
      createdByUserId: admin.id,
    };

    await ctx.prisma.activity.create({
      data: { ...base, title: 'draft', status: ActivityStatus.draft },
    });
    await ctx.prisma.activity.create({
      data: { ...base, title: 'published', status: ActivityStatus.published },
    });
    await ctx.prisma.activity.create({
      data: { ...base, title: 'full', status: ActivityStatus.full, capacity: 1, registeredCount: 1 },
    });
    await ctx.prisma.activity.create({
      data: { ...base, title: 'closed', status: ActivityStatus.closed },
    });
  });

  afterAll(async () => {
    await ctx.app?.close();
  });

  it('returns only published/full, registrationStatus=auth_required when unauthenticated', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/activities').expect(200);

    expect(res.body.items).toBeInstanceOf(Array);
    const statuses = res.body.items.map((x: any) => x.activity.status).sort();
    expect(statuses).toEqual(['full', 'published']);

    for (const item of res.body.items) {
      expect(item.registrationStatus).toBe('auth_required');
    }
  });
});
