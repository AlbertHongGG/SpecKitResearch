import { createTestDb } from '../helpers/test-db';
import { createTestApp } from '../helpers/test-app';

describe('US2 integration: invalid session -> 401', () => {
  it('after logout, session endpoint returns 401', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      await http.post('/auth/register').send({ email: 's2@example.com', password: 'password123' }).expect(201);
      const loginRes = await http.post('/auth/login').send({ email: 's2@example.com', password: 'password123' }).expect(200);
      const cookie = (loginRes.headers['set-cookie']?.[0] || '').split(';')[0];

      await http.get('/auth/session').set('cookie', cookie).expect(200);
      await http.post('/auth/logout').set('cookie', cookie).expect(204);
      await http.get('/auth/session').set('cookie', cookie).expect(401);
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
