import { AuthSessionResponseSchema } from '@app/contracts';
import { createTestDb } from '../helpers/test-db';
import { createTestApp, extractCookie } from '../helpers/test-app';

describe('US2 contract: auth', () => {
  it('register -> login -> session -> logout behaves consistently', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      await http.post('/auth/register').send({ email: 's1@example.com', password: 'password123' }).expect(201);

      const loginRes = await http.post('/auth/login').send({ email: 's1@example.com', password: 'password123' }).expect(200);
      const cookie = extractCookie(loginRes.headers['set-cookie']);
      expect(cookie).toBeTruthy();

      AuthSessionResponseSchema.parse(loginRes.body);

      const sessionRes = await http.get('/auth/session').set('cookie', cookie as string).expect(200);
      AuthSessionResponseSchema.parse(sessionRes.body);

      await http.post('/auth/logout').set('cookie', cookie as string).expect(204);
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
