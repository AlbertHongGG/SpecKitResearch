import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

import { createTestApp } from '../helpers/testApp';
import { authHeaders, bootstrapCsrf, loginAs } from '../helpers/auth';

describe('[US2] terminal simulate does not write events', () => {
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

  it('re-simulate on terminal order returns 409 and does not append OrderStateEvent', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'user@example.com' } });
    expect(user).toBeTruthy();

    const orderNo = `ORD_TERM_${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        userId: user!.id,
        orderNo,
        status: 'paid',
        amount: 100,
        currency: 'TWD',
        callbackUrl: 'http://localhost:9999/callback',
        returnMethod: 'query_string',
        paymentMethodCode: 'CREDIT_CARD_SIM',
        simulationScenario: 'success',
        delaySec: 0,
        webhookDelaySec: null,
        errorCode: null,
        errorMessage: null,
        webhookUrl: null,
        webhookEndpointId: null,
        completedAt: new Date(),
      },
    });

    const beforeCount = await prisma.orderStateEvent.count({ where: { orderId: order.id } });

    const res = await app.inject({
      method: 'POST',
      url: `/api/pay/${orderNo}/simulate`,
      headers: authHeaders({ csrfToken, sessionCookie }),
    });

    expect(res.statusCode).toBe(409);

    const afterCount = await prisma.orderStateEvent.count({ where: { orderId: order.id } });
    expect(afterCount).toBe(beforeCount);
  });
});
