import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from '../helpers/testApp';
import { authHeaders, bootstrapCsrf, loginAs } from '../helpers/auth';

describe('[US4] updating scenario template affects new orders', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let csrfToken = '';

  beforeAll(async () => {
    app = await createTestApp();
    const csrf = await bootstrapCsrf(app);
    csrfToken = csrf.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('admin patches delayed_success default_delay_sec -> new order inherits', async () => {
    const admin = await loginAs(app, { email: 'admin@example.com', password: 'admin1234', csrfToken });

    const newDelay = 7;
    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/api/admin/scenario-templates/delayed_success',
      headers: {
        ...authHeaders({ csrfToken, sessionCookie: admin.sessionCookie }),
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ enabled: true, default_delay_sec: newDelay }),
    });

    expect(patchRes.statusCode).toBe(200);

    const user = await loginAs(app, { email: 'user@example.com', password: 'user1234', csrfToken });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: {
        ...authHeaders({ csrfToken, sessionCookie: user.sessionCookie }),
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        amount: 100,
        currency: 'TWD',
        callback_url: 'http://localhost:9999/callback',
        webhook_url: null,
        payment_method_code: 'CREDIT_CARD_SIM',
        simulation_scenario: 'delayed_success',
      }),
    });

    expect(createRes.statusCode).toBe(200);
    const body = createRes.json() as any;
    expect(body.order.delay_sec).toBe(newDelay);
  });
});
