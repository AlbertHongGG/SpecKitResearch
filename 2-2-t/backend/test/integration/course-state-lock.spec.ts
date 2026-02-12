import { createTestDb } from '../helpers/test-db';
import { createTestApp } from '../helpers/test-app';
import { registerUser, loginUser } from '../helpers/test-auth';

describe('US4 integration: submitted lock', () => {
  it('submitted course cannot be edited (409)', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      await registerUser({
        http,
        prisma: db.prisma,
        email: 'inst7@example.com',
        password: 'password123',
        role: 'instructor',
      });
      const { cookie } = await loginUser({ http, email: 'inst7@example.com', password: 'password123' });

      const createRes = await http
        .post('/instructor/courses')
        .set('cookie', cookie)
        .send({ title: 'My Course', description: 'desc', price: 100 })
        .expect(201);

      const courseId = createRes.body?.id;
      expect(courseId).toBeTruthy();

      await http.post(`/instructor/courses/${encodeURIComponent(courseId)}/submit`).set('cookie', cookie).expect(200);

      await http
        .patch(`/instructor/courses/${encodeURIComponent(courseId)}`)
        .set('cookie', cookie)
        .send({ title: 'Changed' })
        .expect(409);
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
