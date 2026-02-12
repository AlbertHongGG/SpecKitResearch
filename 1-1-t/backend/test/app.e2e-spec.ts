import request from 'supertest';
import { bootstrapTestApp, clearDatabase } from './bootstrap';

describe('AppController (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof bootstrapTestApp>>;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });

  beforeEach(async () => {
    await clearDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('/ (GET)', () => {
    return request(ctx.app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ ok: true });
  });
});
