import { createTestDb } from '../helpers/test-db';
import { createTestApp } from '../helpers/test-app';
import { registerUser, loginUser } from '../helpers/test-auth';

describe('US1 integration: marketing visibility 404 rules', () => {
  it('guest cannot see non-published course (404), owner can see it (200)', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      const instructor = await registerUser({
        http,
        prisma: db.prisma,
        email: 'inst2@example.com',
        password: 'password123',
        role: 'instructor',
      });

      const draft = await db.prisma.course.create({
        data: {
          instructorId: instructor.id,
          title: 'Draft course',
          description: 'desc',
          price: 0,
          status: 'draft',
        },
      });

      await http.get(`/courses/${encodeURIComponent(draft.id)}`).expect(404);

      const { cookie } = await loginUser({ http, email: 'inst2@example.com', password: 'password123' });
      await http.get(`/courses/${encodeURIComponent(draft.id)}`).set('cookie', cookie).expect(200);
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
