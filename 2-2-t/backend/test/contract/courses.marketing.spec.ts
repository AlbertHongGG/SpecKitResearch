import { CourseMarketingDetailSchema, CourseMarketingListSchema } from '@app/contracts';
import { createTestDb } from '../helpers/test-db';
import { createTestApp } from '../helpers/test-app';
import { registerUser, loginUser } from '../helpers/test-auth';

describe('US1 contract: courses marketing', () => {
  it('GET /courses and GET /courses/:id match contract schemas', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      const instructor = await registerUser({
        http,
        prisma: db.prisma,
        email: 'inst1@example.com',
        password: 'password123',
        role: 'instructor',
      });

      const course = await db.prisma.course.create({
        data: {
          instructorId: instructor.id,
          title: 'Published course',
          description: 'desc',
          price: 100,
          status: 'published',
          publishedAt: new Date(),
          sections: {
            create: [
              {
                title: 'S1',
                position: 1,
                lessons: {
                  create: [{ title: 'L1', position: 1, contentType: 'text', contentText: 'Hello' }],
                },
              },
            ],
          },
        },
      });

      const listRes = await http.get('/courses').expect(200);
      CourseMarketingListSchema.parse(listRes.body);

      const detailRes = await http.get(`/courses/${encodeURIComponent(course.id)}`).expect(200);
      CourseMarketingDetailSchema.parse(detailRes.body);

      // viewer flags should reflect authentication state
      const { cookie } = await loginUser({ http, email: 'inst1@example.com', password: 'password123' });
      const authedRes = await http.get(`/courses/${encodeURIComponent(course.id)}`).set('cookie', cookie).expect(200);
      const parsed = CourseMarketingDetailSchema.parse(authedRes.body);
      expect(parsed.viewer.isAuthenticated).toBe(true);
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
