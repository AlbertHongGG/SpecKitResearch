import request from 'supertest';
import { Role } from '@prisma/client';
import { bootstrapTestApp, clearDatabase } from './bootstrap';
import { createUserWithRole, loginUser } from './test-utils';

describe('US2 publish makes activity visible (e2e)', () => {
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

  it('draft -> published then appears in /activities', async () => {
    const token = (
      await loginUser(ctx.app, {
        email: 'admin@example.com',
        password: 'admin1234',
      })
    ).body.token;

    const now = Date.now();

    const created = await request(ctx.app.getHttpServer())
      .post('/admin/activities')
      .set('authorization', `Bearer ${token}`)
      .send({
        title: 'A1',
        description: 'd',
        location: 'l',
        capacity: 2,
        deadline: new Date(now + 60 * 60 * 1000).toISOString(),
        date: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
      })
      .expect(201);

    const activityId = created.body.id;

    await request(ctx.app.getHttpServer())
      .post(`/admin/activities/${activityId}/transitions`)
      .set('authorization', `Bearer ${token}`)
      .send({ action: 'publish' })
      .expect(200);

    const list = await request(ctx.app.getHttpServer())
      .get('/activities')
      .expect(200);

    const ids = list.body.items.map((x: any) => x.activity.id);
    expect(ids).toContain(activityId);
  });
});
