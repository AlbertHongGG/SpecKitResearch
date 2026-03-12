import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('audit contract', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('lists organization audit entries for org admins', async () => {
    const orgAgent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });
    const csrfToken = await getCsrfToken(orgAgent);

    await orgAgent
      .post(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/members/invite`)
      .set('x-csrf-token', csrfToken)
      .send({ email: 'audit-member@example.com' })
      .expect(201);

    const response = await orgAgent
      .get(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/audit`)
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('auditLogId');
    expect(response.body.some((entry: { action: string }) => entry.action === 'member_invited')).toBe(true);
  });

  it('lists platform audit entries for platform admins', async () => {
    const platformAgent = await loginAs(context, {
      email: 'platform-admin@example.com',
      password: 'platform-admin-password',
    });
    const csrfToken = await getCsrfToken(platformAgent);

    await platformAgent
      .patch(`/api/platform/orgs/${context.fixtures.organizations.alphaOrgId}`)
      .set('x-csrf-token', csrfToken)
      .send({ status: 'suspended' })
      .expect(200);

    const response = await platformAgent.get('/api/platform/audit?action=organization_suspended').expect(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].action).toBe('organization_suspended');
  });

  it('lists issue timeline entries for project members', async () => {
    const developerAgent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });

    const response = await developerAgent
      .get(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/${context.fixtures.issues.bugIssueKey}/timeline`)
      .expect(200);

    expect(response.body.issue.issueKey).toBe(context.fixtures.issues.bugIssueKey);
    expect(Array.isArray(response.body.timeline)).toBe(true);
  });
});
