import { createTestDb } from '../helpers/test-db';
import { createTestApp } from '../helpers/test-app';
import { registerUser, loginUser } from '../helpers/test-auth';

describe('US5 integration: admin stats', () => {
  it('GET /stats/admin returns aggregated stats for admin', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      await registerUser({ http, prisma: db.prisma, email: 'admin4@example.com', password: 'password123', role: 'admin' });
      const { cookie } = await loginUser({ http, email: 'admin4@example.com', password: 'password123' });

      const res = await http.get('/stats/admin').set('cookie', cookie).expect(200);
      expect(typeof res.body?.users).toBe('number');
      expect(typeof res.body?.purchases).toBe('number');
      expect(typeof res.body?.coursesByStatus).toBe('object');
      expect(res.body.coursesByStatus).toHaveProperty('draft');
      expect(res.body.coursesByStatus).toHaveProperty('published');
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
