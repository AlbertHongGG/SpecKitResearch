import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000';

async function login(request: APIRequestContext, email: string) {
  const loginRes = await request.post(`${API_ORIGIN}/auth/login`, {
    data: { email, password: 'password1234' },
  });
  expect(loginRes.ok()).toBeTruthy();
}

test('audit query scopes: non-platform requires orgId/projectId, platform can query global', async ({ request }) => {
  await login(request, 'viewer@example.com');

  const globalAsViewer = await request.get(`${API_ORIGIN}/audit`);
  expect(globalAsViewer.status()).toBe(404);

  const orgsRes = await request.get(`${API_ORIGIN}/orgs`);
  expect(orgsRes.ok()).toBeTruthy();
  const orgsBody = (await orgsRes.json()) as { organizations: Array<{ id: string }> };
  expect(orgsBody.organizations.length).toBeGreaterThan(0);
  const orgId = orgsBody.organizations[0]!.id;

  const orgScopeRes = await request.get(`${API_ORIGIN}/audit`, { params: { orgId } });
  expect(orgScopeRes.ok()).toBeTruthy();

  const projectsRes = await request.get(`${API_ORIGIN}/orgs/${orgId}/projects`);
  expect(projectsRes.ok()).toBeTruthy();
  const projectsBody = (await projectsRes.json()) as { projects: Array<{ id: string }> };
  expect(projectsBody.projects.length).toBeGreaterThan(0);
  const projectId = projectsBody.projects[0]!.id;

  const projectScopeRes = await request.get(`${API_ORIGIN}/audit`, { params: { projectId } });
  expect(projectScopeRes.ok()).toBeTruthy();

  await login(request, 'admin@example.com');
  const globalAsAdmin = await request.get(`${API_ORIGIN}/audit`);
  expect(globalAsAdmin.ok()).toBeTruthy();
});
