import request from 'supertest';

import { createTestApp, resetDatabase } from './test-app';

describe('e2e: auth', () => {
  jest.setTimeout(20_000);

  test('register -> /me -> logout -> /me unauthorized', async () => {
    const { app, prisma } = await createTestApp();

    try {
      await resetDatabase(prisma);

      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new.member@example.com', password: 'password1234', name: 'New Member' })
        .expect(201);

      const cookie1 = registerRes.headers['set-cookie']?.[0];
      expect(cookie1).toBeTruthy();

      expect(registerRes.body).toMatchObject({
        id: expect.any(String),
        email: 'new.member@example.com',
        name: 'New Member',
        role: 'member',
      });

      const meRes = await request(app.getHttpServer()).get('/me').set('Cookie', cookie1).expect(200);
      expect(meRes.body).toMatchObject({
        id: registerRes.body.id,
        email: 'new.member@example.com',
        name: 'New Member',
        role: 'member',
      });

      const logoutRes = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookie1)
        .expect(200);

      const cookie2 = logoutRes.headers['set-cookie']?.[0];
      expect(cookie2).toBeTruthy();

      await request(app.getHttpServer()).get('/me').set('Cookie', cookie2).expect(401);
    } finally {
      await app.close();
    }
  });
});
