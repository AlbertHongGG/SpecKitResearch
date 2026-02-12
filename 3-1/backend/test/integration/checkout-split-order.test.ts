import request from 'supertest';
import { createTestApp } from '../test-app';
import { createCategory, createProduct, createUser, prismaForTestDb } from '../test-factories';

describe('Checkout split order', () => {
  it('splits suborders by seller and snapshots pricing', async () => {
    const prisma = prismaForTestDb();
    const seller1 = await createUser(prisma, { email: `s1${Date.now()}@e.com`, roles: ['seller'] });
    const seller2 = await createUser(prisma, { email: `s2${Date.now()}@e.com`, roles: ['seller'] });
    const category = await createCategory(prisma, `C${Date.now()}`);
    const p1 = await createProduct(prisma, {
      sellerId: seller1.id,
      categoryId: category.id,
      title: 'P1',
      price: 1000,
      stock: 10,
    });
    const p2 = await createProduct(prisma, {
      sellerId: seller2.id,
      categoryId: category.id,
      title: 'P2',
      price: 2000,
      stock: 10,
    });

    const app = await createTestApp();
    const server = app.getHttpServer();

    const buyerEmail = `b${Date.now()}@e.com`;
    await request(server).post('/api/auth/signup').send({ email: buyerEmail, password: 'password123' });
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: buyerEmail, password: 'password123' });
    const cookie = login.headers['set-cookie']?.[0];

    await request(server).post('/api/cart/items').set('Cookie', cookie).send({ productId: p1.id, quantity: 2 }).expect(201);
    await request(server).post('/api/cart/items').set('Cookie', cookie).send({ productId: p2.id, quantity: 1 }).expect(201);

    const txId = `tx_${Date.now()}_aaaa`;
    const checkout = await request(server)
      .post('/api/checkout')
      .set('Cookie', cookie)
      .send({ paymentMethod: 'mock', transactionId: txId })
      .expect(201);

    const orderId = checkout.body.orderId;
    expect(orderId).toBeTruthy();

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { subOrders: { include: { items: true } } } });
    expect(order?.subOrders.length).toBe(2);
    const allItems = order!.subOrders.flatMap((s) => s.items);
    expect(allItems.some((i) => i.productId === p1.id && i.unitPriceSnapshot === 1000 && i.quantity === 2)).toBe(true);
    expect(allItems.some((i) => i.productId === p2.id && i.unitPriceSnapshot === 2000 && i.quantity === 1)).toBe(true);

    await prisma.$disconnect();
    await app.close();
  });
});
