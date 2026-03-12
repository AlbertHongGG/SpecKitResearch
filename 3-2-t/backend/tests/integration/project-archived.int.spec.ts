import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('project archived write rejection', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('blocks issue updates, transitions, and comments after archiving', async () => {
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

    const updateResponse = await developerAgent
      .patch(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/${context.fixtures.issues.bugIssueKey}`)
      .set('x-csrf-token', developerCsrf)
      .send({ expectedVersion: 3, title: 'Blocked title' });
    expect(updateResponse.status).toBe(403);
    expect(updateResponse.body.errorCode).toBe('PROJECT_ARCHIVED');

    const transitionResponse = await developerAgent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/${context.fixtures.issues.bugIssueKey}/transition`)
      .set('x-csrf-token', developerCsrf)
      .send({ expectedVersion: 3, toStatusKey: 'done' });
    expect(transitionResponse.status).toBe(403);
    expect(transitionResponse.body.errorCode).toBe('PROJECT_ARCHIVED');

    const commentResponse = await developerAgent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/${context.fixtures.issues.bugIssueKey}/comments`)
      .set('x-csrf-token', developerCsrf)
      .send({ body: 'Blocked comment' });
    expect(commentResponse.status).toBe(403);
    expect(commentResponse.body.errorCode).toBe('PROJECT_ARCHIVED');
  });
});
