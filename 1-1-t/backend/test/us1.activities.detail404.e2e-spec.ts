import request from 'supertest';
import { bootstrapTestApp, clearDatabase } from './bootstrap';

describe('US1 /activities/:id 404 (e2e)', () => {
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

  it('returns 404 for non-existent activity', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/activities/not-exist')
      .expect(404);

    expect(res.body.code).toBe('NOT_FOUND');
  });
});
