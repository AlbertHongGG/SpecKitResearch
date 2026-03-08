import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import { hashPassword } from '../../src/domain/auth/password';
import { runWebhookWorkerOnce } from '../../src/worker/webhook_worker';
import { createTestDatabaseUrl, migrateTestDatabase } from '../test_db';

describe('US2 webhook resend', () => {
  let prisma: PrismaClient;
  let cookieHeader: string;
  let receiverUrl: string;
  let receiver: any;

  beforeAll(async () => {
    const { url } = createTestDatabaseUrl();
    process.env.DATABASE_URL = url;
    process.env.COOKIE_SIGNING_SECRET = 'test_cookie_signing_secret_123456';
    process.env.WEBHOOK_SIGNING_SECRET = 'test_webhook_signing_secret_123456';
    migrateTestDatabase({ cwd: `${process.cwd()}`, databaseUrl: url });

    prisma = new PrismaClient({ datasources: { db: { url } } });
    await prisma.user.create({
      data: {
        email: 'dev@example.com',
        password_hash: await hashPassword('password123'),
        role: 'USER_DEVELOPER',
      },
    });
    await prisma.paymentMethod.create({
      data: { code: 'card', display_name: 'Card', enabled: true, sort_order: 1 },
    });
    await prisma.systemSetting.upsert({
      where: { key: 'allowed_currencies' },
      update: {},
      create: { key: 'allowed_currencies', value_json: ['TWD', 'USD'] },
    });
    await prisma.systemSetting.upsert({
      where: { key: 'default_return_method' },
      update: {},
      create: { key: 'default_return_method', value_json: 'query_string' },
    });

    receiver = Fastify();
    receiver.post('/webhook', async (req) => {
      return { ok: true };
    });
    await receiver.listen({ host: '127.0.0.1', port: 0 });
    const addr = receiver.server.address();
    const port = typeof addr === 'string' ? 0 : addr?.port;
    receiverUrl = `http://127.0.0.1:${port}/webhook`;

    const app = await buildApp();
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'dev@example.com', password: 'password123' },
    });
    const setCookie = loginRes.headers['set-cookie'];
    cookieHeader = Array.isArray(setCookie) ? setCookie.join(';') : (setCookie as string);
    await app.close();
  });

  afterAll(async () => {
    await receiver?.close();
    await prisma?.$disconnect();
  });

  it('delivers webhook and supports resend (payload stable)', async () => {
    const app = await buildApp();

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: { cookie: cookieHeader },
      payload: {
        amount: 100,
        currency: 'TWD',
        callback_url: 'http://localhost:9999/callback',
        webhook_url: receiverUrl,
        webhook_delay_sec: 0,
        payment_method_code: 'card',
        simulation_scenario_type: 'success',
        delay_sec: 0,
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json();
    const orderNo = created.data.order.order_no;
    const orderId = created.data.order.id;

    await app.inject({ method: 'GET', url: `/api/pay/${orderNo}`, headers: { cookie: cookieHeader } });
    const payRes = await app.inject({
      method: 'POST',
      url: `/api/pay/${orderNo}`,
      headers: { cookie: cookieHeader },
      payload: { confirm: true },
    });
    expect(payRes.statusCode).toBe(200);

    await runWebhookWorkerOnce({
      prisma: (app as any).prisma,
      envSigningSecret: process.env.WEBHOOK_SIGNING_SECRET,
      lockTtlSec: 10,
      now: new Date(),
    });

    const detail1 = await app.inject({
      method: 'GET',
      url: `/api/orders/${orderId}`,
      headers: { cookie: cookieHeader },
    });
    expect(detail1.statusCode).toBe(200);
    const o1 = detail1.json().data;
    expect(o1.webhook_logs.length).toBe(1);
    const payload1 = o1.webhook_logs[0].payload;

    const resendRes = await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/webhook/resend`,
      headers: { cookie: cookieHeader },
    });
    expect(resendRes.statusCode).toBe(200);

    await runWebhookWorkerOnce({
      prisma: (app as any).prisma,
      envSigningSecret: process.env.WEBHOOK_SIGNING_SECRET,
      lockTtlSec: 10,
      now: new Date(),
    });

    const detail2 = await app.inject({
      method: 'GET',
      url: `/api/orders/${orderId}`,
      headers: { cookie: cookieHeader },
    });
    const o2 = detail2.json().data;
    expect(o2.webhook_logs.length).toBe(2);
    expect(o2.webhook_logs[1].payload).toEqual(payload1);

    await app.close();
  });
});
