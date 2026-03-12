import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('platform organizations contract', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('lists organizations for a platform admin', async () => {
    const agent = await loginAs(context, {
      email: 'platform-admin@example.com',
      password: 'platform-admin-password',
    });

    const response = await agent.get('/api/platform/orgs').expect(200);
    expect(response.body).toHaveLength(3);
    expect(response.body.map((organization: { organizationId: string }) => organization.organizationId)).toEqual(
      expect.arrayContaining([
        context.fixtures.organizations.alphaOrgId,
        context.fixtures.organizations.betaOrgId,
        context.fixtures.organizations.suspendedOrgId,
      ]),
    );
    expect(response.body[0]).toHaveProperty('organizationId');
  });

  it('creates and updates an organization', async () => {
    const agent = await loginAs(context, {
      email: 'platform-admin@example.com',
      password: 'platform-admin-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const created = await agent
      .post('/api/platform/orgs')
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Gamma Organization', plan: 'paid' })
      .expect(201);

    expect(created.body.name).toBe('Gamma Organization');

    const updated = await agent
      .patch(`/api/platform/orgs/${created.body.organizationId}`)
      .set('x-csrf-token', csrfToken)
      .send({ status: 'suspended', plan: 'free' })
      .expect(200);

    expect(updated.body.status).toBe('suspended');
    expect(updated.body.plan).toBe('free');
  });

  it('rejects non-platform admins', async () => {
    const agent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });

    const response = await agent.get('/api/platform/orgs');
    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('ROLE_REQUIRED');
  });
});
