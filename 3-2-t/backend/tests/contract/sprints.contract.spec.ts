import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('sprints contract', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('lists sprints for the project', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });

    const response = await agent.get(`/api/projects/${context.fixtures.projects.alphaProjectId}/sprints`).expect(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].status).toBe('active');
  });

  it('creates, starts, and closes a sprint', async () => {
    const agent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const createResponse = await agent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/sprints`)
      .set('x-csrf-token', csrfToken)
      .send({
        name: 'Sprint 2',
        goal: 'Finish workflow governance polishing',
      })
      .expect(201);

    await agent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/sprints/${context.fixtures.sprints.activeSprintId}/close`)
      .set('x-csrf-token', csrfToken)
      .expect(201);

    const startResponse = await agent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/sprints/${createResponse.body.id}/start`)
      .set('x-csrf-token', csrfToken)
      .expect(201);

    expect(startResponse.body.status).toBe('active');

    const closeResponse = await agent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/sprints/${createResponse.body.id}/close`)
      .set('x-csrf-token', csrfToken)
      .expect(201);

    expect(closeResponse.body.status).toBe('closed');
  });

  it('rejects sprint creation from non-managers', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const response = await agent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/sprints`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Unauthorized Sprint' });

    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('ROLE_REQUIRED');
  });
});
