import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { api, createTestContext, disposeTestContext, loginAs, resetTestContext, type TestContext } from '../support/test-app';

describe('auth contract', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('logs in and exposes session state', async () => {
    const agent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });

    const sessionResponse = await agent.get('/api/session').expect(200);
    expect(sessionResponse.body.authenticated).toBe(true);
    expect(sessionResponse.body.user.email).toBe('org-admin@example.com');
    expect(sessionResponse.body.organizationMemberships).toHaveLength(2);
  });

  it('rejects invalid credentials', async () => {
    const response = await api(context).post('/api/auth/login').send({
      email: 'org-admin@example.com',
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body.errorCode).toBe('UNAUTHENTICATED');
  });

  it('logs out and clears the session', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });

    await agent.post('/api/auth/logout').expect(201);
    const sessionResponse = await agent.get('/api/session').expect(200);
    expect(sessionResponse.body.authenticated).toBe(false);
  });
});export class Placeholder {
  // Auto-generated scaffold.
}
