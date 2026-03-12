import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { api, createTestContext, disposeTestContext, loginAs, type TestContext } from '../support/test-app';

describe('access semantics', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('returns 401 when not signed in', async () => {
    const response = await api(context).get('/api/orgs');
    expect(response.status).toBe(401);
    expect(response.body.errorCode).toBe('UNAUTHENTICATED');
  });

  it('returns 403 when the user is a member but lacks the admin role', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });

    const response = await agent.get(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/admin/access`);
    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('ROLE_REQUIRED');
  });
});export class Placeholder {
  // Auto-generated scaffold.
}
