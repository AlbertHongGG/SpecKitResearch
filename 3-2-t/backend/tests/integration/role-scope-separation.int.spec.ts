import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('role scope separation', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('does not allow org admins to access platform administration endpoints', async () => {
    const agent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });

    const response = await agent.get('/api/platform/orgs');
    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('ROLE_REQUIRED');
  });

  it('hides project membership administration from platform admins without org membership', async () => {
    const agent = await loginAs(context, {
      email: 'platform-admin@example.com',
      password: 'platform-admin-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const response = await agent
      .put(`/api/projects/${context.fixtures.projects.alphaProjectId}/members`)
      .set('x-csrf-token', csrfToken)
      .send({ userId: context.fixtures.users.outsiderId, projectRole: 'viewer' });

    expect(response.status).toBe(404);
    expect(response.body.errorCode).toBe('RESOURCE_NOT_FOUND');
  });
});
