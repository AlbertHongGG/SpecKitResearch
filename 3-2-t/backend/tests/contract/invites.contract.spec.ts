import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { api, createTestContext, disposeTestContext, loginAs, type TestContext } from '../support/test-app';

describe('invite contract', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('accepts an invite for an authenticated user', async () => {
    const agent = await loginAs(context, {
      email: 'outsider@example.com',
      password: 'outsider-password',
    });

    const response = await agent.post(`/api/invites/${context.fixtures.inviteToken}/accept`).expect(201);
    expect(response.body.organizationName).toBe('Alpha Organization');

    const organizations = await agent.get('/api/orgs').expect(200);
    expect(organizations.body.map((organization: { name: string }) => organization.name)).toContain('Alpha Organization');
  });

  it('requires authentication', async () => {
    const response = await api(context).post(`/api/invites/${context.fixtures.inviteToken}/accept`);
    expect(response.status).toBe(401);
  });

  it('returns 404 for an unknown invite token', async () => {
    const agent = await loginAs(context, {
      email: 'outsider@example.com',
      password: 'outsider-password',
    });

    const response = await agent.post('/api/invites/not-a-real-token/accept');
    expect(response.status).toBe(404);
    expect(response.body.errorCode).toBe('RESOURCE_NOT_FOUND');
  });
});export class Placeholder {
  // Auto-generated scaffold.
}
