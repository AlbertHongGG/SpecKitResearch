import request from 'supertest';

import { createTestApp, resetDatabase, seedDatabase } from './test-app';

describe('e2e: admin rbac', () => {
  jest.setTimeout(20_000);

  test('guest gets 401; member gets 403 on admin endpoints', async () => {
    const { app, prisma } = await createTestApp();

    try {
      await resetDatabase(prisma);
      const seeded = await seedDatabase(prisma);

      await request(app.getHttpServer()).get('/admin/activities').expect(401);

      const memberLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: seeded.member.email, password: seeded.member.password })
        .expect(201);

      const memberCookie = memberLogin.headers['set-cookie']?.[0];
      expect(memberCookie).toBeTruthy();

      await request(app.getHttpServer()).get('/admin/activities').set('Cookie', memberCookie).expect(403);
    } finally {
      await app.close();
    }
  });
});
