import request from 'supertest';
import { createTestApp } from '../test-app';
import { createCategory, createProduct, createUser, prismaForTestDb } from '../test-factories';

describe('Admin force refund terminality', () => {
  it('admin force refund makes SubOrder terminal (cannot be rejected after)', async () => {
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET ?? 'change-me';
    const prisma = prismaForTestDb();
    const seller = await createUser(prisma, { email: `s_${Date.now()}@e.com`, roles: ['seller'] });
    const admin = await createUser(prisma, { email: `a_${Date.now()}@e.com`, roles: ['admin'] });
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
    const buyerLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: buyerEmail, password: 'password123' })
      .expect(201);
    const buyerCookie = buyerLogin.headers['set-cookie']?.[0];

    const sellerLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: seller.email, password: 'password123' })
      .expect(201);
    const sellerCookie = sellerLogin.headers['set-cookie']?.[0];

    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'password123' })
      .expect(201);
    const adminCookie = adminLogin.headers['set-cookie']?.[0];

    await request(server).post('/api/cart/items').set('Cookie', buyerCookie).send({ productId: p1.id, quantity: 1 }).expect(201);

    const txId = `tx_${Date.now()}_cccc`;
    const checkout = await request(server)
      .post('/api/checkout')
      .set('Cookie', buyerCookie)
      .send({ paymentMethod: 'mock', transactionId: txId })
      .expect(201);

    const orderId = checkout.body.orderId;

    await request(server)
      .post('/api/payments/webhook')
      .set('x-webhook-secret', webhookSecret)
      .send({ provider: 'mock', eventId: `evt_${Date.now()}_cccc`, orderId, transactionId: txId, status: 'succeeded', paymentMethod: 'mock' })
      .expect(201);

    const sub = await prisma.subOrder.findFirst({ where: { orderId } });
    expect(sub).toBeTruthy();

    const refundCreate = await request(server)
      .post('/api/refunds')
      .set('Cookie', buyerCookie)
      .send({ suborderId: sub!.id, reason: 'want refund', requestedAmount: 1000 })
      .expect(201);

    const refundId = refundCreate.body.refund.id;

    await request(server)
      .post(`/api/admin/refunds/${refundId}/force`)
      .set('Cookie', adminCookie)
      .send({ reason: 'policy' })
      .expect(201);

    await request(server)
      .post(`/api/seller/refunds/${refundId}/reject`)
      .set('Cookie', sellerCookie)
      .send({ note: 'no' })
      .expect(409);

    const updatedSub = await prisma.subOrder.findUnique({ where: { id: sub!.id } });
    expect(updatedSub?.status).toBe('refunded');

    await prisma.$disconnect();
    await app.close();
  });
});
