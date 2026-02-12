import request from 'supertest';
import { createTestApp } from '../test-app';
import { prismaForTestDb, createUser, createCategory } from '../test-factories';

describe('US2 product status rules', () => {
  it('seller product is draft by default; seller can activate/inactivate; only admin can ban', async () => {
    const app = await createTestApp();
    const server = app.getHttpServer();
    const prisma = prismaForTestDb();

    const admin = await createUser(prisma, { email: `admin_${Date.now()}@example.com`, roles: ['admin'] });
    const seller = await createUser(prisma, { email: `seller_${Date.now()}@example.com`, roles: ['seller'] });
    const cat = await createCategory(prisma, `cat_${Date.now()}`);

    const sellerLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: seller.email, password: 'password123' })
      .expect(201);
    const sellerCookie = sellerLogin.headers['set-cookie']?.[0];

    const created = await request(server)
      .post('/api/seller/products')
      .set('Cookie', sellerCookie)
      .send({ title: 'New', description: 'New', price: 1000, stock: 1, categoryId: cat.id })
      .expect(201);

    const productId = created.body?.product?.id;
    expect(productId).toBeTruthy();
    expect(created.body.product.status).toBe('draft');

    await request(server)
      .patch(`/api/seller/products/${productId}`)
      .set('Cookie', sellerCookie)
      .send({ status: 'active' })
      .expect(200);

    await request(server)
      .patch(`/api/seller/products/${productId}`)
      .set('Cookie', sellerCookie)
      .send({ status: 'inactive' })
      .expect(200);

    await request(server)
      .patch(`/api/seller/products/${productId}`)
      .set('Cookie', sellerCookie)
      .send({ status: 'banned' })
      .expect(403);

    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'password123' })
      .expect(201);
    const adminCookie = adminLogin.headers['set-cookie']?.[0];

    await request(server)
      .patch(`/api/admin/products/${productId}`)
      .set('Cookie', adminCookie)
      .send({ status: 'banned' })
      .expect(200);

    await prisma.$disconnect();
    await app.close();
  });
});
