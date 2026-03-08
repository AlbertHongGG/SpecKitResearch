import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

import { createTestApp } from '../helpers/testApp';
import { authHeaders, bootstrapCsrf, loginAs } from '../helpers/auth';

describe('[US2] failed payload consistency', () => {
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

  it('failed order writes error_code/error_message into ReturnLog payload', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: {
        ...authHeaders({ csrfToken, sessionCookie }),
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        amount: 200,
        currency: 'TWD',
        callback_url: 'http://localhost:9999/callback',
        webhook_url: 'http://localhost:9999/webhook',
        payment_method_code: 'CREDIT_CARD_SIM',
        simulation_scenario: 'failed',
      }),
    });

    expect(createRes.statusCode).toBe(200);
    const orderNo = (createRes.json() as any).order.order_no as string;

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
    const body = simulateRes.json() as any;
    expect(body.status).toBe('failed');

    const order = await prisma.order.findUnique({ where: { orderNo } });
    expect(order?.status).toBe('failed');
    expect(order?.errorCode).toBeTruthy();

    const returnLog = await prisma.returnLog.findFirst({ where: { orderId: order!.id }, orderBy: { initiatedAt: 'desc' } });
    expect(returnLog).toBeTruthy();

    const payload = returnLog!.payload as any;
    expect(payload.order_no).toBe(orderNo);
    expect(payload.status).toBe('failed');
    expect(payload.error_code).toBe(order!.errorCode);
    expect(payload.error_message).toBe(order!.errorMessage);
    expect(payload.return_log_id).toBe(returnLog!.id);
    expect(payload.event_id).toBeTruthy();
  });
});
