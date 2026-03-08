import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import { hashPassword } from '../../src/domain/auth/password';
import { runWebhookWorkerOnce } from '../../src/worker/webhook_worker';
import { createTestDatabaseUrl, migrateTestDatabase } from '../test_db';

describe('US3 replay', () => {
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
    receiver.post('/webhook', async () => ({ ok: true }));
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

  it('replay full_flow appends ReturnLog and enqueues webhook job without changing order status', async () => {
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
    const created = createRes.json();
    const orderNo = created.data.order.order_no;
    const orderId = created.data.order.id;

    await app.inject({ method: 'GET', url: `/api/pay/${orderNo}`, headers: { cookie: cookieHeader } });
    await app.inject({
      method: 'POST',
      url: `/api/pay/${orderNo}`,
      headers: { cookie: cookieHeader },
      payload: { confirm: true },
    });

    const before = await app.inject({ method: 'GET', url: `/api/orders/${orderId}`, headers: { cookie: cookieHeader } });
    const beforeOrder = before.json().data;
    expect(beforeOrder.status).toBe('paid');
    const beforeReturnCount = beforeOrder.return_logs.length;

    const replayRes = await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/replay`,
      headers: { cookie: cookieHeader },
      payload: { scope: 'full_flow' },
    });
    expect(replayRes.statusCode).toBe(200);
    const replayRunId = replayRes.json().data.replay_run_id;
    expect(replayRunId).toBeTruthy();

    await runWebhookWorkerOnce({
      prisma: (app as any).prisma,
      envSigningSecret: process.env.WEBHOOK_SIGNING_SECRET,
      lockTtlSec: 10,
      now: new Date(),
    });

    const after = await app.inject({ method: 'GET', url: `/api/orders/${orderId}`, headers: { cookie: cookieHeader } });
    const afterOrder = after.json().data;
    expect(afterOrder.status).toBe('paid');
    expect(afterOrder.return_logs.length).toBe(beforeReturnCount + 1);
    expect(afterOrder.return_logs.some((l: any) => l.replay_run_id === replayRunId)).toBe(true);

    await app.close();
  });
});
