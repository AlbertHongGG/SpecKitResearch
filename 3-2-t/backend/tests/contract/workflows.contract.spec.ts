import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('workflows contract', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('returns the active workflow for the project', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });

    const response = await agent.get(`/api/projects/${context.fixtures.projects.alphaProjectId}/workflows`).expect(200);
    expect(response.body.version).toBe(1);
    expect(response.body.statuses.map((status: { key: string }) => status.key)).toEqual(['todo', 'in_progress', 'done']);
  });

  it('creates a new workflow version and migrates matching issue statuses', async () => {
    const agent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const updateResponse = await agent
      .put(`/api/projects/${context.fixtures.projects.alphaProjectId}/workflows`)
      .set('x-csrf-token', csrfToken)
      .send({
        name: 'Delivery workflow',
        statuses: [
          { key: 'todo', name: 'To Do' },
          { key: 'in_progress', name: 'In Progress' },
          { key: 'review', name: 'Review' },
          { key: 'done', name: 'Done' },
        ],
        transitions: [
          { from: 'todo', to: 'in_progress' },
          { from: 'in_progress', to: 'review' },
          { from: 'review', to: 'done' },
        ],
      })
      .expect(200);

    expect(updateResponse.body.version).toBe(2);
    expect(updateResponse.body.statuses.map((status: { key: string }) => status.key)).toContain('review');

    const storyResponse = await agent
      .get(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/${context.fixtures.issues.storyIssueKey}`)
      .expect(200);
    expect(storyResponse.body.status.workflowVersion).toBe(2);
    expect(storyResponse.body.status.key).toBe('in_progress');
  });

  it('rejects workflow updates from non-managers', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const response = await agent
      .put(`/api/projects/${context.fixtures.projects.alphaProjectId}/workflows`)
      .set('x-csrf-token', csrfToken)
      .send({
        name: 'Unauthorized workflow',
        statuses: [{ key: 'todo', name: 'To Do' }],
        transitions: [],
      });

    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('ROLE_REQUIRED');
  });
});
