import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestContext, disposeTestContext, getCsrfToken, loginAs, type TestContext } from '../support/test-app';

describe('archive immutability', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('rejects repeated archive requests for an already archived project', async () => {
    const orgAgent = await loginAs(context, {
      email: 'org-admin@example.com',
      password: 'org-admin-password',
    });
    const csrfToken = await getCsrfToken(orgAgent);

    await orgAgent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/archive`)
      .set('x-csrf-token', csrfToken)
      .expect(201);

    const secondResponse = await orgAgent
      .post(`/api/projects/${context.fixtures.projects.alphaProjectId}/archive`)
      .set('x-csrf-token', csrfToken);

    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.errorCode).toBe('CONFLICT');
  });
});
