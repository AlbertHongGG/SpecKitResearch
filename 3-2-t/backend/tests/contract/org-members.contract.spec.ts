import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('organization members contract', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('returns org overview and member list for org admins', async () => {
    const agent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });

    const overview = await agent.get(`/api/orgs/${context.fixtures.organizations.alphaOrgId}`).expect(200);
    expect(overview.body.name).toBe('Alpha Organization');

    const members = await agent.get(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/members`).expect(200);
    expect(members.body.length).toBeGreaterThanOrEqual(3);
  });

  it('creates an invite and updates a member role', async () => {
    const agent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const invite = await agent
      .post(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/members/invite`)
      .set('x-csrf-token', csrfToken)
      .send({ email: 'new-member@example.com' })
      .expect(201);
    expect(invite.body.email).toBe('new-member@example.com');

    const members = await agent.get(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/members`).expect(200);
    const developer = members.body.find((member: { email: string }) => member.email === 'developer@example.com');

    const updated = await agent
      .patch(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/members/${developer.membershipId}`)
      .set('x-csrf-token', csrfToken)
      .send({ orgRole: 'org_admin' })
      .expect(200);

    expect(updated.body.orgRole).toBe('org_admin');
  });

  it('rejects non-admin member management', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });

    const response = await agent.get(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/members`);
    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('ROLE_REQUIRED');
  });
});
