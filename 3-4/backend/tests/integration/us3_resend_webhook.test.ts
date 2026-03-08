import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import http from 'node:http';
import crypto from 'node:crypto';

import { createTestApp } from '../helpers/testApp';
import { authHeaders, bootstrapCsrf, loginAs } from '../helpers/auth';
import { sendWebhookOnceNow } from '../../src/jobs/webhookWorker';

type Receiver = {
  url: string;
  received: Array<{ headers: http.IncomingHttpHeaders; body: string }>;
  close: () => Promise<void>;
};

async function startReceiver(): Promise<Receiver> {
  const received: Receiver['received'] = [];

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => {
      received.push({ headers: req.headers, body: Buffer.concat(chunks).toString('utf8') });
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('bad server addr');

  return {
    url: `http://127.0.0.1:${addr.port}/webhook`,
    received,
    close: async () =>
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

describe('[US3] resend webhook', () => {
  const prisma = new PrismaClient();
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let csrfToken = '';
  let sessionCookie: { name: string; value: string };
  let receiver: Receiver;

  beforeAll(async () => {
    receiver = await startReceiver();
    app = await createTestApp();

    const csrf = await bootstrapCsrf(app);
    csrfToken = csrf.token;

    const login = await loginAs(app, { email: 'user@example.com', password: 'user1234', csrfToken });
    sessionCookie = login.sessionCookie;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
    await receiver.close();
  });

  it('resend creates new WebhookLog with same event_id as last attempt', async () => {
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
        webhook_url: receiver.url,
        payment_method_code: 'CREDIT_CARD_SIM',
        simulation_scenario: 'success',
      }),
    });

    expect(createRes.statusCode).toBe(200);
    const orderNo = (createRes.json() as any).order.order_no as string;

    const enterRes = await app.inject({ method: 'POST', url: `/api/pay/${orderNo}/enter`, headers: authHeaders({ csrfToken, sessionCookie }) });
    expect(enterRes.statusCode).toBe(200);

    const simulateRes = await app.inject({ method: 'POST', url: `/api/pay/${orderNo}/simulate`, headers: authHeaders({ csrfToken, sessionCookie }) });
    expect(simulateRes.statusCode).toBe(200);

    const order = await prisma.order.findUnique({ where: { orderNo } });
    expect(order?.webhookEndpointId).toBeTruthy();

    const eventId = crypto.randomUUID();
    const first = await sendWebhookOnceNow({
      orderId: order!.id,
      webhookEndpointId: order!.webhookEndpointId!,
      url: receiver.url,
      eventId,
    });
    expect(first).toBeTruthy();

    const resendRes = await app.inject({
      method: 'POST',
      url: `/api/orders/${orderNo}/resend-webhook`,
      headers: authHeaders({ csrfToken, sessionCookie }),
    });

    expect(resendRes.statusCode).toBe(200);

    const logs = await prisma.webhookLog.findMany({ where: { orderId: order!.id }, orderBy: { sentAt: 'desc' }, take: 2 });
    expect(logs.length).toBe(2);
    expect(logs[0]!.eventId).toBe(eventId);
    expect(logs[1]!.eventId).toBe(eventId);

    expect(receiver.received.length).toBeGreaterThanOrEqual(2);
  });
});
