import request from 'supertest';

import { createTestApp, resetDatabase, seedDatabase } from '../integration/test-app';

describe('contract: GET /activities', () => {
  test('returns { items } with ActivitySummary schema (published/full only)', async () => {
    const { app, prisma } = await createTestApp();
    try {
      await resetDatabase(prisma);
      await seedDatabase(prisma);

      const res = await request(app.getHttpServer()).get('/activities').expect(200);

      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);

      for (const item of res.body.items) {
        expect(item).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          date: expect.any(String),
          location: expect.any(String),
          status: expect.any(String),
          registeredCount: expect.any(Number),
          capacity: expect.any(Number),
        });
        expect(['PUBLISHED', 'FULL']).toContain(item.status);
      }
    } finally {
      await app.close();
    }
  });
});
