import { createTestDb } from '../helpers/test-db';
import { createTestApp } from '../helpers/test-app';
import { registerUser, loginUser } from '../helpers/test-auth';

describe('US3 integration: purchase idempotency', () => {
  it('POST /courses/:id/purchase is idempotent (unique constraint)', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      const instructor = await registerUser({
        http,
        prisma: db.prisma,
        email: 'inst3@example.com',
        password: 'password123',
        role: 'instructor',
      });
      const student = await registerUser({
        http,
        prisma: db.prisma,
        email: 's3@example.com',
        password: 'password123',
        role: 'student',
      });

      const course = await db.prisma.course.create({
        data: {
          instructorId: instructor.id,
          title: 'Published',
          description: 'desc',
          price: 100,
          status: 'published',
          publishedAt: new Date(),
        },
      });

      const { cookie } = await loginUser({ http, email: student.email, password: 'password123' });
      await http.post(`/courses/${encodeURIComponent(course.id)}/purchase`).set('cookie', cookie).expect(200);
      await http.post(`/courses/${encodeURIComponent(course.id)}/purchase`).set('cookie', cookie).expect(200);

      const count = await db.prisma.purchase.count({ where: { userId: student.id, courseId: course.id } });
      expect(count).toBe(1);
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
