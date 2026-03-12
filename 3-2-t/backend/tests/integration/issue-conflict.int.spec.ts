import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('issue optimistic concurrency', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('returns 409 when an update uses a stale expected version', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });
    const csrfToken = await getCsrfToken(agent);

    await agent
      .patch(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/${context.fixtures.issues.bugIssueKey}`)
      .set('x-csrf-token', csrfToken)
      .send({
        expectedVersion: 1,
        title: 'First conflict-safe update',
      })
      .expect(200);

    const staleResponse = await agent
      .patch(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/${context.fixtures.issues.bugIssueKey}`)
      .set('x-csrf-token', csrfToken)
      .send({
        expectedVersion: 1,
        priority: 'high',
      });

    expect(staleResponse.status).toBe(409);
    expect(staleResponse.body.errorCode).toBe('CONFLICT');
  });
});
