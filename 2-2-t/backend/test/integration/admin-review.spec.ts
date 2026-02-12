import { createTestDb } from '../helpers/test-db';
import { createTestApp } from '../helpers/test-app';
import { registerUser, loginUser } from '../helpers/test-auth';

describe('US5 integration: admin review rules', () => {
  it('rejected decision requires reason; history records decisions', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      await registerUser({
        http,
        prisma: db.prisma,
        email: 'admin1@example.com',
        password: 'password123',
        role: 'admin',
      });
      await registerUser({
        http,
        prisma: db.prisma,
        email: 'inst9@example.com',
        password: 'password123',
        role: 'instructor',
      });

      const { cookie: instCookie } = await loginUser({ http, email: 'inst9@example.com', password: 'password123' });
      const createRes = await http
        .post('/instructor/courses')
        .set('cookie', instCookie)
        .send({ title: 'My Course', description: 'desc', price: 100 })
        .expect(201);
      const courseId = createRes.body.id as string;

      await http.post(`/instructor/courses/${encodeURIComponent(courseId)}/submit`).set('cookie', instCookie).expect(200);

      const { cookie: adminCookie } = await loginUser({ http, email: 'admin1@example.com', password: 'password123' });

      await http
        .post(`/admin/reviews/${encodeURIComponent(courseId)}/decision`)
        .set('cookie', adminCookie)
        .send({ decision: 'rejected' })
        .expect(400);

      await http
        .post(`/admin/reviews/${encodeURIComponent(courseId)}/decision`)
        .set('cookie', adminCookie)
        .send({ decision: 'rejected', reason: 'Not enough content' })
        .expect(200);

      const history = await http
        .get(`/admin/reviews/${encodeURIComponent(courseId)}/history`)
        .set('cookie', adminCookie)
        .expect(200);
      expect(Array.isArray(history.body?.items)).toBe(true);
      expect(history.body.items.length).toBeGreaterThan(0);
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
