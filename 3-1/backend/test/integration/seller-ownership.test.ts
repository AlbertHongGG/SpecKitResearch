import request from 'supertest';
import { createTestApp } from '../test-app';
import { prismaForTestDb, createUser, createCategory, createProduct } from '../test-factories';

describe('US2 seller ownership (IDOR protection)', () => {
  it('seller cannot update another seller product', async () => {
    const app = await createTestApp();
    const server = app.getHttpServer();
    const prisma = prismaForTestDb();

    const seller1 = await createUser(prisma, { email: `s1_${Date.now()}@example.com`, roles: ['seller'] });
    const seller2 = await createUser(prisma, { email: `s2_${Date.now()}@example.com`, roles: ['seller'] });
    const cat = await createCategory(prisma, `c_${Date.now()}`);

    const p2 = await createProduct(prisma, {
      sellerId: seller2.id,
      categoryId: cat.id,
      title: 'P2',
      price: 1000,
      stock: 10,
    });

    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: seller1.email, password: 'password123' })
      .expect(201);
    const cookie = login.headers['set-cookie']?.[0];

    await request(server)
      .patch(`/api/seller/products/${p2.id}`)
      .set('Cookie', cookie)
      .send({ title: 'Hacked' })
      .expect(403);

    await prisma.$disconnect();
    await app.close();
  });
});
