import request from 'supertest';

import { createTestApp, resetDatabase, seedDatabase } from '../integration/test-app';

describe('contract: GET /activities/:id', () => {
  test('200 for published activity and matches ActivityDetail schema', async () => {
    const { app, prisma } = await createTestApp();
    try {
      await resetDatabase(prisma);
      await seedDatabase(prisma);

      const published = await prisma.activity.findFirst({ where: { status: 'PUBLISHED' } });
      expect(published).toBeTruthy();

      const res = await request(app.getHttpServer())
        .get(`/activities/${published!.id}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: published!.id,
        title: expect.any(String),
        description: expect.any(String),
        date: expect.any(String),
        deadline: expect.any(String),
        location: expect.any(String),
        status: expect.any(String),
        registeredCount: expect.any(Number),
        capacity: expect.any(Number),
      });
    } finally {
      await app.close();
    }
  });

  test('404 for draft activity', async () => {
    const { app, prisma } = await createTestApp();
    try {
      await resetDatabase(prisma);
      await seedDatabase(prisma);

      const draft = await prisma.activity.findFirst({ where: { status: 'DRAFT' } });
      expect(draft).toBeTruthy();

      await request(app.getHttpServer()).get(`/activities/${draft!.id}`).expect(404);
    } finally {
      await app.close();
    }
  });

  test('404 for unknown id', async () => {
    const { app } = await createTestApp();
    try {
      await request(app.getHttpServer()).get('/activities/does-not-exist').expect(404);
    } finally {
      await app.close();
    }
  });
});
