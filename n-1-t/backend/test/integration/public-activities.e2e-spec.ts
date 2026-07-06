import request from 'supertest';

import { createTestApp, resetDatabase, seedDatabase } from './test-app';

describe('e2e: public activities', () => {
  test('list returns only published/full; detail 404 for draft', async () => {
    const { app, prisma } = await createTestApp();
    try {
      await resetDatabase(prisma);
      await seedDatabase(prisma);

      const listRes = await request(app.getHttpServer()).get('/activities').expect(200);
      const statuses = (listRes.body.items ?? []).map((x: any) => x.status);
      expect(statuses.every((s: string) => s === 'PUBLISHED' || s === 'FULL')).toBe(true);

      const draft = await prisma.activity.findFirst({ where: { status: 'DRAFT' } });
      expect(draft).toBeTruthy();

      await request(app.getHttpServer()).get(`/activities/${draft!.id}`).expect(404);
    } finally {
      await app.close();
    }
  });
});
