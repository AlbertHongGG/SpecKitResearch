import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

import { createTestApp } from '../helpers/testApp';
import { authHeaders, bootstrapCsrf, loginAs } from '../helpers/auth';

describe('[US3] replay full_flow', () => {
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

  it('replay full_flow creates ReturnLog/WebhookJob with replay_run_id and does not change status', async () => {
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
      }),
    });

    expect(createRes.statusCode).toBe(200);
    const orderNo = (createRes.json() as any).order.order_no as string;

    await app.inject({ method: 'POST', url: `/api/pay/${orderNo}/enter`, headers: authHeaders({ csrfToken, sessionCookie }) });
    await app.inject({ method: 'POST', url: `/api/pay/${orderNo}/simulate`, headers: authHeaders({ csrfToken, sessionCookie }) });

    const before = await prisma.order.findUnique({ where: { orderNo } });
    expect(before?.status).toBe('paid');

    const replayRes = await app.inject({
      method: 'POST',
      url: `/api/orders/${orderNo}/replay`,
      headers: {
        ...authHeaders({ csrfToken, sessionCookie }),
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ scope: 'full_flow' }),
    });

    expect(replayRes.statusCode).toBe(200);
    const replayId = (replayRes.json() as any).replay_run_id as string;
    expect(replayId).toBeTruthy();

    const after = await prisma.order.findUnique({ where: { orderNo } });
    expect(after?.status).toBe('paid');

    const run = await prisma.replayRun.findUnique({ where: { id: replayId } });
    expect(run?.status).toBe('succeeded');

    const order = await prisma.order.findUnique({ where: { orderNo } });

    const returnLog = await prisma.returnLog.findFirst({ where: { orderId: order!.id, replayRunId: replayId } });
    expect(returnLog).toBeTruthy();

    const job = await prisma.webhookJob.findFirst({ where: { orderId: order!.id, replayRunId: replayId } });
    expect(job).toBeTruthy();
  });
});
