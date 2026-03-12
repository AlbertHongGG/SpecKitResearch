import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('deprecated status behavior', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('rejects transitions for issues that remain on removed workflow statuses', async () => {
    const manager = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });
    const managerCsrfToken = await getCsrfToken(manager);

    await manager
      .put(`/api/projects/${context.fixtures.projects.alphaProjectId}/workflows`)
      .set('x-csrf-token', managerCsrfToken)
      .send({
        name: 'Simplified workflow',
        statuses: [
          { key: 'todo', name: 'To Do' },
          { key: 'done', name: 'Done' },
        ],
        transitions: [{ from: 'todo', to: 'done' }],
      })
      .expect(200);

    const developer = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });
    const developerCsrfToken = await getCsrfToken(developer);

    const response = await developer
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/${context.fixtures.issues.storyIssueKey}/transition`)
      .set('x-csrf-token', developerCsrfToken)
      .send({
        expectedVersion: 1,
        toStatusKey: 'done',
      });

    expect(response.status).toBe(409);
    expect(response.body.errorCode).toBe('ISSUE_STATUS_DEPRECATED');
  });
});
