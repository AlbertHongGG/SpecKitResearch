import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('project membership contract', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('creates a project within an organization and assigns a project role', async () => {
    const agent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const createdProject = await agent
      .post(`/api/orgs/${context.fixtures.organizations.alphaOrgId}/projects/create`)
      .set('x-csrf-token', csrfToken)
      .send({ key: 'OPS', name: 'Operations Project', type: 'kanban' })
      .expect(201);

    expect(createdProject.body.key).toBe('OPS');

    const assigned = await agent
      .put(`/api/projects/${createdProject.body.projectId}/members`)
      .set('x-csrf-token', csrfToken)
      .send({ userId: context.fixtures.users.developerId, projectRole: 'viewer' })
      .expect(200);

    expect(assigned.body.projectRole).toBe('viewer');
  });

  it('lists and updates project members', async () => {
    const agent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const members = await agent.get(`/api/projects/${context.fixtures.projects.alphaProjectId}/members`).expect(200);
    const developer = members.body.find((member: { email: string }) => member.email === 'developer@example.com');

    const updated = await agent
      .patch(`/api/projects/${context.fixtures.projects.alphaProjectId}/members/${developer.membershipId}`)
      .set('x-csrf-token', csrfToken)
      .send({ projectRole: 'viewer' })
      .expect(200);

    expect(updated.body.projectRole).toBe('viewer');
  });

  it('rejects non-admin project role assignment', async () => {
    const agent = await loginAs(context, {
      email: 'developer@example.com',
      password: 'developer-password',
    });
    const csrfToken = await getCsrfToken(agent);

    const response = await agent
      .put(`/api/projects/${context.fixtures.projects.alphaProjectId}/members`)
      .set('x-csrf-token', csrfToken)
      .send({ userId: context.fixtures.users.outsiderId, projectRole: 'viewer' });

    expect(response.status).toBe(403);
    expect(response.body.errorCode).toBe('ROLE_REQUIRED');
  });
});
