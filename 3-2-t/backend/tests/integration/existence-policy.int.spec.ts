import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, loginAs, type TestContext } from '../support/test-app';

describe('existence-hiding policy', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('returns 404 for an organization route when the user is not a member', async () => {
    const agent = await loginAs(context, {
      email: 'outsider@example.com',
      password: 'outsider-password',
    });

    const response = await agent.get(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/access`);
    expect(response.status).toBe(404);
    expect(response.body.errorCode).toBe('RESOURCE_NOT_FOUND');
  });

  it('returns 404 for a project route when the user is not a member', async () => {
    const agent = await loginAs(context, {
      email: 'outsider@example.com',
      password: 'outsider-password',
    });

    const response = await agent.get(`/api/projects/${context.fixtures.projects.alphaProjectId}/access`);
    expect(response.status).toBe(404);
    expect(response.body.errorCode).toBe('RESOURCE_NOT_FOUND');
  });
});export class Placeholder {
  // Auto-generated scaffold.
}
