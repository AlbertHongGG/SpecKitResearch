import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('read-only contract', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('returns ORG_SUSPENDED for org-scoped writes', async () => {
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

    const response = await orgAgent
      .post(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/projects/create`)
      .set('x-csrf-token', orgCsrf)
      .send({ key: 'SUP', name: 'Suspended Project', type: 'scrum' });

    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('ORG_SUSPENDED');
  });

  it('returns PROJECT_ARCHIVED for project-scoped writes', async () => {
    const orgAgent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });
    const orgCsrf = await getCsrfToken(orgAgent);

    await orgAgent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/archive`)
      .set('x-csrf-token', orgCsrf)
      .expect(201);

    const developerAgent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });
    const developerCsrf = await getCsrfToken(developerAgent);

    const response = await developerAgent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/${context.fixtures.issues.bugIssueKey}/comments`)
      .set('x-csrf-token', developerCsrf)
      .send({ body: 'This should fail on archived project.' });

    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('PROJECT_ARCHIVED');
  });
});
