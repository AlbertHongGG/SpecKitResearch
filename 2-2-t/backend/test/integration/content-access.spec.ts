import { createTestDb } from '../helpers/test-db';
import { createTestApp } from '../helpers/test-app';
import { registerUser, loginUser } from '../helpers/test-auth';

describe('US3 integration: content access 401/403', () => {
  it('requires auth (401) and purchase (403) for reader endpoint', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      const instructor = await registerUser({
        http,
        prisma: db.prisma,
        email: 'inst4@example.com',
        password: 'password123',
        role: 'instructor',
      });
      const student = await registerUser({
        http,
        prisma: db.prisma,
        email: 's4@example.com',
        password: 'password123',
        role: 'student',
      });
      const other = await registerUser({
        http,
        prisma: db.prisma,
        email: 's4b@example.com',
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
          sections: {
            create: [
              {
                title: 'S',
                position: 1,
                lessons: {
                  create: [{ title: 'L', position: 1, contentType: 'text', contentText: 'Hello' }],
                },
              },
            ],
          },
        },
        include: { sections: { include: { lessons: true } } },
      });
      const lessonId = course.sections[0]?.lessons[0]?.id;
      expect(lessonId).toBeTruthy();

      await http.get(`/my-courses/${encodeURIComponent(course.id)}?lessonId=${encodeURIComponent(lessonId!)}`).expect(401);

      const { cookie: otherCookie } = await loginUser({ http, email: other.email, password: 'password123' });
      await http
        .get(`/my-courses/${encodeURIComponent(course.id)}?lessonId=${encodeURIComponent(lessonId!)}`)
        .set('cookie', otherCookie)
        .expect(403);

      const { cookie: studentCookie } = await loginUser({ http, email: student.email, password: 'password123' });
      await http.post(`/courses/${encodeURIComponent(course.id)}/purchase`).set('cookie', studentCookie).expect(200);
      await http
        .get(`/my-courses/${encodeURIComponent(course.id)}?lessonId=${encodeURIComponent(lessonId!)}`)
        .set('cookie', studentCookie)
        .expect(200);
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
