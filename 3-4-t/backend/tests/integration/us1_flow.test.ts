import { beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import { hashPassword } from '../../src/domain/auth/password';
import { createTestDatabaseUrl, migrateTestDatabase } from '../test_db';

describe('US1 flow', () => {
  let prisma: PrismaClient;
  let cookieHeader: string;

  beforeAll(async () => {
    const { url } = createTestDatabaseUrl();
    process.env.DATABASE_URL = url;
    process.env.COOKIE_SIGNING_SECRET = 'test_cookie_signing_secret_123456';
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

  it('create -> pay page load -> pay produces ReturnLog and events', async () => {
    const app = await buildApp();

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: { cookie: cookieHeader },
      payload: {
        amount: 100,
        currency: 'TWD',
        callback_url: 'http://localhost:9999/callback',
        webhook_url: null,
        payment_method_code: 'card',
        simulation_scenario_type: 'success',
        delay_sec: 0,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const created = createRes.json();
    const orderNo = created.data.order.order_no;

    const loadRes = await app.inject({
      method: 'GET',
      url: `/api/pay/${orderNo}`,
      headers: { cookie: cookieHeader },
    });
    expect(loadRes.statusCode).toBe(200);
    const loaded = loadRes.json();
    expect(loaded.data.status).toBe('payment_pending');

    const payRes = await app.inject({
      method: 'POST',
      url: `/api/pay/${orderNo}`,
      headers: { cookie: cookieHeader },
      payload: { confirm: true },
    });
    expect(payRes.statusCode).toBe(200);
    const paid = payRes.json();
    expect(paid.data.order.status).toBe('paid');
    expect(paid.data.order.return_logs.length).toBeGreaterThanOrEqual(1);
    expect(paid.data.order.state_events.some((e: any) => e.to === 'paid')).toBe(true);

    await app.close();
  });
});
