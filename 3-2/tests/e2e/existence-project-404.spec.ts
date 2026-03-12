import { expect, test } from '@playwright/test';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000';

test('non-member project routes return 404', async ({ request }) => {
  // Get an existing projectId (as admin)
  const loginAdmin = await request.post(`${API_ORIGIN}/auth/login`, {
    data: { email: 'admin@example.com', password: 'password1234' },
  });
  expect(loginAdmin.ok()).toBeTruthy();

  const orgsRes = await request.get(`${API_ORIGIN}/orgs`);
  expect(orgsRes.ok()).toBeTruthy();
  const orgsBody = (await orgsRes.json()) as { organizations: Array<{ id: string }> };
  const orgId = orgsBody.organizations[0].id;

  const projectsRes = await request.get(`${API_ORIGIN}/orgs/${orgId}/projects`);
  expect(projectsRes.ok()).toBeTruthy();
  const projectsBody = (await projectsRes.json()) as { projects: Array<{ id: string }> };
  const projectId = projectsBody.projects[0].id;

  // Login as a seeded user who has NO memberships
  const loginUser = await request.post(`${API_ORIGIN}/auth/login`, {
    data: { email: 'user@example.com', password: 'password1234' },
  });
  expect(loginUser.ok()).toBeTruthy();

  const res = await request.get(`${API_ORIGIN}/projects/${projectId}/issues`);
  expect(res.status()).toBe(404);

  const body = (await res.json()) as { error?: { code?: string } };
  expect(body.error?.code).toBe('NOT_FOUND');
});
