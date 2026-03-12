import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000';

async function loginAsAdmin(request: APIRequestContext) {
  const loginRes = await request.post(`${API_ORIGIN}/auth/login`, {
    data: { email: 'admin@example.com', password: 'password1234' },
  });
  expect(loginRes.ok()).toBeTruthy();
}

async function getCsrfToken(request: APIRequestContext) {
  const csrfRes = await request.get(`${API_ORIGIN}/auth/csrf`);
  expect(csrfRes.ok()).toBeTruthy();
  const csrfBody = (await csrfRes.json()) as { csrfToken: string };
  return csrfBody.csrfToken;
}

test('project archive blocks issue mutations', async ({ request }) => {
  await loginAsAdmin(request);
  const csrf = await getCsrfToken(request);

  const orgRes = await request.post(`${API_ORIGIN}/platform/orgs`, {
    data: { name: `E2E Org ${Date.now()}`, plan: 'free' },
    headers: { 'x-csrf-token': csrf },
  });
  expect(orgRes.ok()).toBeTruthy();
  const orgBody = (await orgRes.json()) as { orgId: string };
  const orgId = orgBody.orgId;

  const projectKey = `P${Date.now().toString().slice(-6)}`;
  const projectRes = await request.post(`${API_ORIGIN}/orgs/${orgId}/projects`, {
    data: { key: projectKey, name: 'E2E Project', type: 'kanban' },
    headers: { 'x-csrf-token': csrf },
  });
  expect(projectRes.ok()).toBeTruthy();
  const projectBody = (await projectRes.json()) as { projectId: string };
  const projectId = projectBody.projectId;

  const issueRes = await request.post(`${API_ORIGIN}/projects/${projectId}/issues`, {
    data: { type: 'task', title: 'E2E Issue', priority: 'medium' },
    headers: { 'x-csrf-token': csrf },
  });
  expect(issueRes.ok()).toBeTruthy();
  const issueBody = (await issueRes.json()) as { issueKey: string };
  const issueKey = issueBody.issueKey;

  const archiveRes = await request.post(`${API_ORIGIN}/projects/${projectId}/settings/archive`, {
    headers: { 'x-csrf-token': csrf },
  });
  expect(archiveRes.ok()).toBeTruthy();

  const commentRes = await request.post(`${API_ORIGIN}/projects/${projectId}/issues/${issueKey}/comments`, {
    data: { body: 'Should be blocked' },
    headers: { 'x-csrf-token': csrf },
  });
  expect(commentRes.status()).toBe(403);
  const commentBody = (await commentRes.json()) as { error?: { code?: string } };
  expect(commentBody.error?.code).toBe('PROJECT_ARCHIVED');

  const createIssueBlockedRes = await request.post(`${API_ORIGIN}/projects/${projectId}/issues`, {
    data: { type: 'task', title: 'E2E Issue 2', priority: 'low' },
    headers: { 'x-csrf-token': csrf },
  });
  expect(createIssueBlockedRes.status()).toBe(403);
  const createIssueBlockedBody = (await createIssueBlockedRes.json()) as { error?: { code?: string } };
  expect(createIssueBlockedBody.error?.code).toBe('PROJECT_ARCHIVED');
});
