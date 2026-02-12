import request from 'supertest';
import { Role } from '@prisma/client';
import { bootstrapTestApp, clearDatabase } from './bootstrap';
import { createUserWithRole, loginUser, registerAndLogin } from './test-utils';

describe('US3 admin registrations export CSV (UTF-8 BOM) (e2e)', () => {
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

  it('returns CSV with UTF-8 BOM and expected columns', async () => {
    const admin = await createUserWithRole(ctx.prisma, {
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

    const member = await registerAndLogin(ctx.app, {
      email: 'm@example.com',
      name: 'Member',
      password: 'password123',
    });
    const memberToken = member.body.token as string;

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
        createdByUserId: admin.id,
      },
    });

    await request(ctx.app.getHttpServer())
      .post(`/activities/${activity.id}/registrations`)
      .set('authorization', `Bearer ${memberToken}`)
      .expect(200);

    const res = await request(ctx.app.getHttpServer())
      .get(`/admin/activities/${activity.id}/registrations.csv`)
      .set('authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);

    // UTF-8 BOM (\uFEFF)
    expect(res.text.charCodeAt(0)).toBe(0xfeff);

    // Basic content checks
    expect(res.text).toContain('userId');
    expect(res.text).toContain('email');
    expect(res.text).toContain('m@example.com');
  });
});
