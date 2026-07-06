import request from 'supertest';

import { createTestApp, resetDatabase, seedDatabase } from './test-app';

describe('e2e: idempotent register', () => {
  jest.setTimeout(20_000);

  test('same idempotencyKey does not create duplicate side effects', async () => {
    const { app, prisma } = await createTestApp();

    try {
      await resetDatabase(prisma);
      const seeded = await seedDatabase(prisma);

      const member = await prisma.user.findUnique({ where: { email: seeded.member.email } });
      expect(member).toBeTruthy();

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeded.member.email, password: seeded.member.password })
        .expect(201);

      const cookie = loginRes.headers['set-cookie']?.[0];
      expect(cookie).toBeTruthy();

      const activity = await prisma.activity.findFirst({ where: { status: 'PUBLISHED' } });
      expect(activity).toBeTruthy();

      const key = 'idem-1';
      await request(app.getHttpServer())
        .post(`/activities/${activity!.id}/registrations`)
        .send({ idempotencyKey: key })
        .set('Cookie', cookie)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/activities/${activity!.id}/registrations`)
        .send({ idempotencyKey: key })
        .set('Cookie', cookie)
        .expect(201);

      const after = await prisma.activity.findUnique({ where: { id: activity!.id } });
      expect(after?.registeredCount).toBe(1);

      const idemCount = await prisma.idempotencyRecord.count({
        where: { userId: member!.id, scope: 'REGISTER', key },
      });
      expect(idemCount).toBe(1);

      const auditCount = await prisma.auditLog.count({
        where: { actorUserId: member!.id, action: 'REGISTRATION_CREATE', targetId: activity!.id },
      });
      expect(auditCount).toBe(1);
    } finally {
      await app.close();
    }
  });
});
