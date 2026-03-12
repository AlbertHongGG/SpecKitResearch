import { expect, test } from '@playwright/test';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000';

test('org admin can create invite (API) and receives token', async ({ request }) => {
  const loginRes = await request.post(`${API_ORIGIN}/auth/login`, {
    data: { email: 'admin@example.com', password: 'password1234' },
  });
  expect(loginRes.ok()).toBeTruthy();

  const orgsRes = await request.get(`${API_ORIGIN}/orgs`);
  expect(orgsRes.ok()).toBeTruthy();
  const orgsBody = (await orgsRes.json()) as { organizations: Array<{ id: string }> };
  expect(orgsBody.organizations.length).toBeGreaterThan(0);
  const orgId = orgsBody.organizations[0].id;

  const csrfRes = await request.get(`${API_ORIGIN}/auth/csrf`);
  expect(csrfRes.ok()).toBeTruthy();
  const csrfBody = (await csrfRes.json()) as { csrfToken: string };

  const invitedEmail = `invitee+${Date.now()}@example.com`;

  const inviteRes = await request.post(`${API_ORIGIN}/orgs/${orgId}/invites`, {
    data: { email: invitedEmail },
    headers: { 'x-csrf-token': csrfBody.csrfToken },
  });
  expect(inviteRes.ok()).toBeTruthy();

  const body = (await inviteRes.json()) as {
    invite: { token: string; expiresAt: string; email: string };
  };

  expect(body.invite.email).toBe(invitedEmail);
  expect(typeof body.invite.token).toBe('string');
  expect(body.invite.token.length).toBeGreaterThan(8);
  expect(typeof body.invite.expiresAt).toBe('string');
});
