import { createTestDb } from '../helpers/test-db';
import { createTestApp } from '../helpers/test-app';
import { registerUser, loginUser } from '../helpers/test-auth';

describe('US4 integration: curriculum reorder unique constraints', () => {
  it('reordering sections and lessons does not violate unique(position)', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      await registerUser({
        http,
        prisma: db.prisma,
        email: 'inst8@example.com',
        password: 'password123',
        role: 'instructor',
      });
      const { cookie } = await loginUser({ http, email: 'inst8@example.com', password: 'password123' });

      const createRes = await http
        .post('/instructor/courses')
        .set('cookie', cookie)
        .send({ title: 'My Course', description: 'desc', price: 100 })
        .expect(201);
      const courseId = createRes.body.id as string;

      const s1 = await http
        .post(`/instructor/courses/${encodeURIComponent(courseId)}/sections`)
        .set('cookie', cookie)
        .send({ title: 'S1' })
        .expect(201);
      const s2 = await http
        .post(`/instructor/courses/${encodeURIComponent(courseId)}/sections`)
        .set('cookie', cookie)
        .send({ title: 'S2' })
        .expect(201);

      const ids = [s2.body.id, s1.body.id];
      await http
        .post(`/instructor/courses/${encodeURIComponent(courseId)}/sections/reorder`)
        .set('cookie', cookie)
        .send({ ids })
        .expect(200);

      const l1 = await http
        .post(`/instructor/sections/${encodeURIComponent(s1.body.id)}/lessons`)
        .set('cookie', cookie)
        .send({ title: 'L1', contentType: 'text', contentText: '' })
        .expect(201);
      const l2 = await http
        .post(`/instructor/sections/${encodeURIComponent(s1.body.id)}/lessons`)
        .set('cookie', cookie)
        .send({ title: 'L2', contentType: 'text', contentText: '' })
        .expect(201);

      await http
        .post(`/instructor/sections/${encodeURIComponent(s1.body.id)}/lessons/reorder`)
        .set('cookie', cookie)
        .send({ ids: [l2.body.id, l1.body.id] })
        .expect(200);
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
