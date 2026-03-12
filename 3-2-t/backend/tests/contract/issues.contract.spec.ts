import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('issues contract', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('creates an issue with labels and sprint assignment', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const response = await agent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/create`)
      .set('x-csrf-token', csrfToken)
      .send({
        type: 'task',
        title: 'Implement optimistic concurrency banner',
        description: '<script>alert(1)</script>Show a warning when stale issue updates are rejected.',
        priority: 'high',
        labels: ['ux', 'conflict'],
        sprintId: context.fixtures.sprints.activeSprintId,
      })
      .expect(201);

    expect(response.body.issueKey).toBe('ALPHA-4');
  expect(response.body.description).toBe('Show a warning when stale issue updates are rejected.');
    expect(response.body.labels).toEqual(['conflict', 'ux']);
    expect(response.body.sprint.id).toBe(context.fixtures.sprints.activeSprintId);
    expect(response.body.status.key).toBe('todo');
  });

  it('updates issue fields and epic link with optimistic concurrency', async () => {
    const agent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const response = await agent
      .patch(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/${context.fixtures.issues.bugIssueKey}`)
      .set('x-csrf-token', csrfToken)
      .send({
        expectedVersion: 1,
        title: '<b>Backlog sorting regression on scrum projects</b>',
        estimate: 5,
        labels: ['bugfix', 'backlog'],
        epicIssueKey: context.fixtures.issues.epicIssueKey,
      })
      .expect(200);

    expect(response.body.title).toBe('Backlog sorting regression on scrum projects');
    expect(response.body.estimate).toBe(5);
    expect(response.body.labels).toEqual(['backlog', 'bugfix']);
    expect(response.body.epicIssueKey).toBe(context.fixtures.issues.epicIssueKey);
    expect(response.body.updatedVersion).toBe(2);
  });

  it('transitions an issue through the active workflow', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const response = await agent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/${context.fixtures.issues.bugIssueKey}/transition`)
      .set('x-csrf-token', csrfToken)
      .send({
        expectedVersion: 1,
        toStatusKey: 'in_progress',
      })
      .expect(201);

    expect(response.body.status.key).toBe('in_progress');
    expect(response.body.updatedVersion).toBe(2);
  });

  it('creates a comment on an issue', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const response = await agent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/issues/${context.fixtures.issues.storyIssueKey}/comments`)
      .set('x-csrf-token', csrfToken)
      .send({
        body: '<img src=x onerror=alert(1)>Verified the column drop targets for scrum board cards.',
      })
      .expect(201);

    expect(response.body.body).toBe('Verified the column drop targets for scrum board cards.');
    expect(response.body.authorUserId).toBe(context.fixtures.users.developerId);
  });
});
