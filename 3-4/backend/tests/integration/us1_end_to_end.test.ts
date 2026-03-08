import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

import { createTestApp } from '../helpers/testApp';
import { authHeaders, bootstrapCsrf, loginAs } from '../helpers/auth';

describe('[US1] end-to-end (API)', () => {
  const prisma = new PrismaClient();
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let csrfToken = '';
  let sessionCookie: { name: string; value: string };

  beforeAll(async () => {
    app = await createTestApp();

    const csrf = await bootstrapCsrf(app);
    csrfToken = csrf.token;

    const login = await loginAs(app, { email: 'user@example.com', password: 'user1234', csrfToken });
    sessionCookie = login.sessionCookie;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('create order -> enter -> simulate creates ReturnLog + WebhookJob', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: {
        ...authHeaders({ csrfToken, sessionCookie }),
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        amount: 100,
        currency: 'TWD',
        callback_url: 'http://localhost:9999/callback',
        webhook_url: 'http://localhost:9999/webhook',
        payment_method_code: 'CREDIT_CARD_SIM',
        simulation_scenario: 'success',
        delay_sec: 0,
      }),
    });

    expect(createRes.statusCode).toBe(200);
    const created = createRes.json() as any;
    expect(created?.order?.order_no).toMatch(/^ORD_/);

    const orderNo = created.order.order_no as string;

    const enterRes = await app.inject({
      method: 'POST',
      url: `/api/pay/${orderNo}/enter`,
      headers: authHeaders({ csrfToken, sessionCookie }),
    });
    expect(enterRes.statusCode).toBe(200);

    const simulateRes = await app.inject({
      method: 'POST',
      url: `/api/pay/${orderNo}/simulate`,
      headers: authHeaders({ csrfToken, sessionCookie }),
    });
    expect(simulateRes.statusCode).toBe(200);

    const simulateBody = simulateRes.json() as any;
    expect(simulateBody.ok).toBe(true);
    expect(simulateBody.status).toBe('paid');
    expect(simulateBody.return_dispatch_url).toBe(`/complete/${orderNo}`);

    const order = await prisma.order.findUnique({ where: { orderNo } });
    expect(order?.status).toBe('paid');

    const returnLogs = await prisma.returnLog.findMany({ where: { orderId: order!.id } });
    expect(returnLogs.length).toBeGreaterThanOrEqual(1);

    const jobs = await prisma.webhookJob.findMany({ where: { orderId: order!.id } });
    expect(jobs.length).toBeGreaterThanOrEqual(1);
  });
});
