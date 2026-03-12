import { expect, test } from '@playwright/test';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000';

test('non-member org route returns 404', async ({ request }) => {
  // Get an existing orgId (as admin)
  const loginAdmin = await request.post(`${API_ORIGIN}/auth/login`, {
    data: { email: 'admin@example.com', password: 'password1234' },
  });
  expect(loginAdmin.ok()).toBeTruthy();

  const orgsRes = await request.get(`${API_ORIGIN}/orgs`);
  expect(orgsRes.ok()).toBeTruthy();
  const orgsBody = (await orgsRes.json()) as { organizations: Array<{ id: string }> };
  const orgId = orgsBody.organizations[0].id;

  // Login as a seeded user who has NO memberships
  const loginUser = await request.post(`${API_ORIGIN}/auth/login`, {
    data: { email: 'user@example.com', password: 'password1234' },
  });
  expect(loginUser.ok()).toBeTruthy();

  const res = await request.get(`${API_ORIGIN}/orgs/${orgId}/projects`);
  expect(res.status()).toBe(404);

  const body = (await res.json()) as { error?: { code?: string; message?: string } };
  expect(body.error?.code).toBe('NOT_FOUND');
});
