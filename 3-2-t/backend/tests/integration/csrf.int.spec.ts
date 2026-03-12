import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('csrf guard integration', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('allows safe session reads without a csrf token', async () => {
    const agent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });

    const response = await agent.get('/api/session').expect(200);
    expect(response.body.authenticated).toBe(true);
  });

  it('rejects writes without a csrf token', async () => {
    const agent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });

    const response = await agent
      .post(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/members/invite`)
      .send({ email: 'csrf-missing@example.com' });

    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects writes with an invalid csrf token', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });
    await getCsrfToken(agent);

    const response = await agent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/create`)
      .set('x-csrf-token', 'invalid-token')
      .send({
        type: 'task',
        title: 'CSRF blocked issue',
        description: 'This write should be rejected.',
      });

    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('CSRF_TOKEN_INVALID');
  });
});
