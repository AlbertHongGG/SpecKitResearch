import request from 'supertest';
import { bootstrapTestApp, clearDatabase } from './bootstrap';
import { registerAndLogin } from './test-utils';

describe('US2 /admin/* authorization (e2e)', () => {
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

  it('rejects non-admin with 403 on /admin/activities', async () => {
    const token = (
      await registerAndLogin(ctx.app, {
        email: 'm1@example.com',
        name: 'M1',
        password: 'member1234',
      })
    ).body.token;

    const res = await request(ctx.app.getHttpServer())
      .get('/admin/activities')
      .set('authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.code).toBe('FORBIDDEN');
  });
});
