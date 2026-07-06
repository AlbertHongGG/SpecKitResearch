import request from 'supertest';

import { createTestApp, resetDatabase, seedDatabase } from './test-app';

describe('e2e: registrations', () => {
  jest.setTimeout(20_000);

  test('member can register then cancel; registeredCount updates', async () => {
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

      const regRes = await request(app.getHttpServer())
        .post(`/activities/${activity!.id}/registrations`)
        .send({ idempotencyKey: 'k1' })
        .set('Cookie', cookie)
        .expect(201);

      expect(regRes.body).toMatchObject({
        activityId: activity!.id,
        registered: true,
        registeredCount: 1,
      });

      const afterReg = await prisma.activity.findUnique({ where: { id: activity!.id } });
      expect(afterReg?.registeredCount).toBe(1);

      const cancelRes = await request(app.getHttpServer())
        .delete(`/activities/${activity!.id}/registrations`)
        .send({ idempotencyKey: 'k2' })
        .set('Cookie', cookie)
        .expect(200);

      expect(cancelRes.body).toMatchObject({
        activityId: activity!.id,
        registered: false,
        registeredCount: 0,
      });

      const afterCancel = await prisma.activity.findUnique({ where: { id: activity!.id } });
      expect(afterCancel?.registeredCount).toBe(0);
    } finally {
      await app.close();
    }
  });
});
