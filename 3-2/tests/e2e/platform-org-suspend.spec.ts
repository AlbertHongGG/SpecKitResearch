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
  expect(typeof csrfBody.csrfToken).toBe('string');
  expect(csrfBody.csrfToken.length).toBeGreaterThan(10);
  return csrfBody.csrfToken;
}

test('platform admin can suspend and unsuspend org (read-only enforced)', async ({ request }) => {
  await loginAsAdmin(request);
  const csrf = await getCsrfToken(request);

  const name = `E2E Org ${Date.now()}`;
  const createOrgRes = await request.post(`${API_ORIGIN}/platform/orgs`, {
    data: { name, plan: 'free' },
    headers: { 'x-csrf-token': csrf },
  });
  expect(createOrgRes.ok()).toBeTruthy();
  const createOrgBody = (await createOrgRes.json()) as { orgId: string };
  expect(typeof createOrgBody.orgId).toBe('string');

  const orgId = createOrgBody.orgId;

  const suspendRes = await request.patch(`${API_ORIGIN}/platform/orgs/${orgId}`, {
    data: { status: 'suspended' },
    headers: { 'x-csrf-token': csrf },
  });
  expect(suspendRes.ok()).toBeTruthy();

  const inviteRes = await request.post(`${API_ORIGIN}/orgs/${orgId}/invites`, {
    data: { email: `invitee+${Date.now()}@example.com` },
    headers: { 'x-csrf-token': csrf },
  });
  expect(inviteRes.status()).toBe(403);
  const inviteBody = (await inviteRes.json()) as { error?: { code?: string } };
  expect(inviteBody.error?.code).toBe('ORG_SUSPENDED');

  const unsuspendRes = await request.patch(`${API_ORIGIN}/platform/orgs/${orgId}`, {
    data: { status: 'active' },
    headers: { 'x-csrf-token': csrf },
  });
  expect(unsuspendRes.ok()).toBeTruthy();

  const inviteOkRes = await request.post(`${API_ORIGIN}/orgs/${orgId}/invites`, {
    data: { email: `invitee+${Date.now()}@example.com` },
    headers: { 'x-csrf-token': csrf },
  });
  expect(inviteOkRes.ok()).toBeTruthy();
});
