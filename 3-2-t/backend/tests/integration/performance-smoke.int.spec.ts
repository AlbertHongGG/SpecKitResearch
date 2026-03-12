import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('performance smoke', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('serves issue list within a local smoke threshold', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });

    const startedAt = performance.now();
    const response = await agent.get(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues`).expect(200);
    const elapsedMs = performance.now() - startedAt;

    expect(response.body.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(750);
  });

  it('serves filtered audit queries within a local smoke threshold', async () => {
    const agent = await loginAs(context, {
      email: 'platform-admin@example.com',
      password: 'platform-admin-password',
    });
    const csrfToken = await getCsrfToken(agent);

    await agent
      .patch(`/api/platform/orgs/${context.fixtures.organizations.alphaOrgId}`)
      .set('x-csrf-token', csrfToken)
      .send({ status: 'suspended' })
      .expect(200);

    const startedAt = performance.now();
    const response = await agent.get('/api/platform/audit?action=organization_suspended').expect(200);
    const elapsedMs = performance.now() - startedAt;

    expect(response.body.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(1000);
  });
});
