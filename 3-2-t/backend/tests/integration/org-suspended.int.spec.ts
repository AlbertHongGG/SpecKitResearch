import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('organization suspended write rejection', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('blocks member invites and project creation once an organization is suspended', async () => {
    const platformAgent = await loginAs(context, {
      email: 'platform-admin@example.com',
      password: 'platform-admin-password',
    });
    const platformCsrf = await getCsrfToken(platformAgent);

    await platformAgent
      .patch(`/api/platform/orgs/${context.fixtures.organizations.alphaOrgId}`)
      .set('x-csrf-token', platformCsrf)
      .send({ status: 'suspended' })
      .expect(200);

    const orgAgent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });
    const orgCsrf = await getCsrfToken(orgAgent);

    const inviteResponse = await orgAgent
      .post(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/members/invite`)
      .set('x-csrf-token', orgCsrf)
      .send({ email: 'blocked@example.com' });
    expect(inviteResponse.status).toBe(403);
    expect(inviteResponse.body.errorCode).toBe('ORG_SUSPENDED');

    const projectResponse = await orgAgent
      .post(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/projects/create`)
      .set('x-csrf-token', orgCsrf)
      .send({ key: 'BLK', name: 'Blocked Project', type: 'scrum' });
    expect(projectResponse.status).toBe(403);
    expect(projectResponse.body.errorCode).toBe('ORG_SUSPENDED');
  });
});
