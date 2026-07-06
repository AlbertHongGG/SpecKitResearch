import request from 'supertest';

import { createTestApp, resetDatabase, seedDatabase } from './test-app';

describe('e2e: my activities', () => {
  jest.setTimeout(20_000);

  test('registered activity appears; after cancel it is removed', async () => {
    const { app, prisma } = await createTestApp();

    try {
      await resetDatabase(prisma);
      const seeded = await seedDatabase(prisma);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeded.member.email, password: seeded.member.password })
        .expect(201);

      const cookie = loginRes.headers['set-cookie']?.[0];
      expect(cookie).toBeTruthy();

      const activity = await prisma.activity.findFirst({ where: { status: 'PUBLISHED' } });
      expect(activity).toBeTruthy();

      await request(app.getHttpServer())
        .post(`/activities/${activity!.id}/registrations`)
        .send({ idempotencyKey: 'my-k1' })
        .set('Cookie', cookie)
        .expect(201);

      const list1 = await request(app.getHttpServer()).get('/my-activities').set('Cookie', cookie).expect(200);
      expect(list1.body.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: activity!.id,
            title: activity!.title,
          }),
        ]),
      );

      await request(app.getHttpServer())
        .delete(`/activities/${activity!.id}/registrations`)
        .send({ idempotencyKey: 'my-k2' })
        .set('Cookie', cookie)
        .expect(200);

      const list2 = await request(app.getHttpServer()).get('/my-activities').set('Cookie', cookie).expect(200);
      const ids = (list2.body.items ?? []).map((x: any) => x.id);
      expect(ids).not.toContain(activity!.id);
    } finally {
      await app.close();
    }
  });
});
