import { createTestDb } from '../helpers/test-db';
import { createTestApp } from '../helpers/test-app';
import { registerUser, loginUser } from '../helpers/test-auth';

describe('US5 integration: admin users management', () => {
  it('admin can disable user and user cannot login (403 USER_DISABLED)', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      await registerUser({ http, prisma: db.prisma, email: 'admin3@example.com', password: 'password123', role: 'admin' });
      const user = await registerUser({ http, prisma: db.prisma, email: 'u1@example.com', password: 'password123', role: 'student' });
      const { cookie: adminCookie } = await loginUser({ http, email: 'admin3@example.com', password: 'password123' });

      await http.patch(`/admin/users/${encodeURIComponent(user.id)}/active`).set('cookie', adminCookie).send({ isActive: false }).expect(200);

      const res = await http.post('/auth/login').send({ email: 'u1@example.com', password: 'password123' }).expect(403);
      expect(res.body?.error?.code).toBe('USER_DISABLED');
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
