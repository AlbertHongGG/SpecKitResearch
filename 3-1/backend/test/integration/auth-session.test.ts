import request from 'supertest';
import { createTestApp } from '../test-app';

describe('Auth session cookie', () => {
  it('signup -> login sets cookie, /auth/me works, logout clears', async () => {
    const app = await createTestApp();
    const server = app.getHttpServer();

    const email = `u${Date.now()}@example.com`;
    await request(server).post('/api/auth/signup').send({ email, password: 'password123' }).expect(201);

    const login = await request(server)
      .post('/api/auth/login')
      .send({ email, password: 'password123' })
      .expect(201);

    const cookie = login.headers['set-cookie']?.[0];
    expect(cookie).toContain('sid=');

    await request(server).get('/api/auth/me').set('Cookie', cookie).expect(200);

    await request(server).post('/api/auth/logout').set('Cookie', cookie).expect(201);

    await request(server).get('/api/auth/me').set('Cookie', cookie).expect(401);

    await app.close();
  });
});
