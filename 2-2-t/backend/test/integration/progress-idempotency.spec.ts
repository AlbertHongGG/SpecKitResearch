import { createTestDb } from '../helpers/test-db';
import { createTestApp } from '../helpers/test-app';
import { registerUser, loginUser } from '../helpers/test-auth';

describe('US3 integration: progress idempotency', () => {
  it('POST /progress/complete is idempotent (unique constraint)', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      const instructor = await registerUser({
        http,
        prisma: db.prisma,
        email: 'inst5@example.com',
        password: 'password123',
        role: 'instructor',
      });
      const student = await registerUser({
        http,
        prisma: db.prisma,
        email: 's5@example.com',
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
      const lessonId = course.sections[0]!.lessons[0]!.id;

      const { cookie } = await loginUser({ http, email: student.email, password: 'password123' });
      await http.post(`/courses/${encodeURIComponent(course.id)}/purchase`).set('cookie', cookie).expect(200);

      await http.post('/progress/complete').set('cookie', cookie).send({ lessonId }).expect(200);
      await http.post('/progress/complete').set('cookie', cookie).send({ lessonId }).expect(200);

      const count = await db.prisma.lessonProgress.count({ where: { userId: student.id, lessonId } });
      expect(count).toBe(1);
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
