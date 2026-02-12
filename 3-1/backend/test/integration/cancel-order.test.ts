import request from 'supertest';
import { createTestApp } from '../test-app';
import { createCategory, createProduct, createUser, prismaForTestDb } from '../test-factories';

describe('Cancel order (pre-payment)', () => {
  it('buyer can cancel an unpaid order and all suborders are cancelled', async () => {
    const prisma = prismaForTestDb();
    const seller = await createUser(prisma, { email: `s_${Date.now()}@e.com`, roles: ['seller'] });
    const category = await createCategory(prisma, `C_${Date.now()}`);
    const p1 = await createProduct(prisma, {
      sellerId: seller.id,
      categoryId: category.id,
      title: 'P1',
      price: 1000,
      stock: 10,
    });

    const app = await createTestApp();
    const server = app.getHttpServer();

    const buyerEmail = `b_${Date.now()}@e.com`;
    await request(server).post('/api/auth/signup').send({ email: buyerEmail, password: 'password123' }).expect(201);
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: buyerEmail, password: 'password123' })
      .expect(201);
    const cookie = login.headers['set-cookie']?.[0];

    await request(server).post('/api/cart/items').set('Cookie', cookie).send({ productId: p1.id, quantity: 1 }).expect(201);

    const txId = `tx_${Date.now()}_bbbb`;
    const checkout = await request(server)
      .post('/api/checkout')
      .set('Cookie', cookie)
      .send({ paymentMethod: 'mock', transactionId: txId })
      .expect(201);

    const orderId = checkout.body.orderId;

    await request(server).post(`/api/orders/${orderId}/cancel`).set('Cookie', cookie).expect(200);

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { subOrders: true } });
    expect(order?.status).toBe('cancelled');
    expect(order?.subOrders.every((s) => s.status === 'cancelled')).toBe(true);

    await prisma.$disconnect();
    await app.close();
  });
});
