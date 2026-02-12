import { createTestDb } from '../helpers/test-db';
import { createTestApp } from '../helpers/test-app';
import { registerUser, loginUser } from '../helpers/test-auth';

describe('US5 integration: taxonomy uniqueness', () => {
  it('duplicate category name is rejected (409)', async () => {
    const db = await createTestDb();
    const { app, http } = await createTestApp();

    try {
      await registerUser({ http, prisma: db.prisma, email: 'admin2@example.com', password: 'password123', role: 'admin' });
      const { cookie } = await loginUser({ http, email: 'admin2@example.com', password: 'password123' });

      await http.post('/taxonomy/category').set('cookie', cookie).send({ name: 'Cat1', isActive: true }).expect(201);
      await http.post('/taxonomy/category').set('cookie', cookie).send({ name: 'Cat1', isActive: true }).expect(409);
    } finally {
      await app.close();
      await db.cleanup();
    }
  });
});
