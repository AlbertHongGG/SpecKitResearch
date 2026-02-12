import request from 'supertest';
import { createTestApp } from '../test-app';
import { createCategory, createProduct, createUser, prismaForTestDb } from '../test-factories';

describe('Payment idempotency + inventory ledger', () => {
  it('replaying webhook does not double-decrement stock', async () => {
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET ?? 'change-me';
    const prisma = prismaForTestDb();
    const seller = await createUser(prisma, { email: `s${Date.now()}@e.com`, roles: ['seller'] });
    const category = await createCategory(prisma, `C${Date.now()}`);
    const product = await createProduct(prisma, {
      sellerId: seller.id,
      categoryId: category.id,
      title: 'P',
      price: 1000,
      stock: 5,
    });

    const app = await createTestApp();
    const server = app.getHttpServer();
    const buyerEmail = `b${Date.now()}@e.com`;
    await request(server).post('/api/auth/signup').send({ email: buyerEmail, password: 'password123' });
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: buyerEmail, password: 'password123' });
    const cookie = login.headers['set-cookie']?.[0];

    await request(server).post('/api/cart/items').set('Cookie', cookie).send({ productId: product.id, quantity: 2 });
    const txId = `tx_${Date.now()}_bbbb`;
    const checkout = await request(server)
      .post('/api/checkout')
      .set('Cookie', cookie)
      .send({ paymentMethod: 'mock', transactionId: txId });

    const orderId = checkout.body.orderId;

    const webhookBody = {
      provider: 'mock',
      eventId: `evt_${Date.now()}`,
      orderId,
      transactionId: txId,
      status: 'succeeded',
      paymentMethod: 'mock',
    };

    await request(server)
      .post('/api/payments/webhook')
      .set('x-webhook-secret', webhookSecret)
      .send(webhookBody)
      .expect(201);
    await request(server)
      .post('/api/payments/webhook')
      .set('x-webhook-secret', webhookSecret)
      .send(webhookBody)
      .expect(201);

    const updated = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updated?.stock).toBe(3);

    const ledgers = await prisma.inventoryLedger.findMany({ where: { productId: product.id, orderId, transactionId: txId } });
    expect(ledgers.length).toBe(1);

    await prisma.$disconnect();
    await app.close();
  });
});
