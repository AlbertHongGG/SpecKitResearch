import { expect, test } from '@playwright/test';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000';

test('accept invite creates membership + consumes token', async ({ page, request }) => {
  // Login as admin and create invite token
  const loginRes = await request.post(`${API_ORIGIN}/auth/login`, {
    data: { email: 'admin@example.com', password: 'password1234' },
  });
  expect(loginRes.ok()).toBeTruthy();

  const orgsRes = await request.get(`${API_ORIGIN}/orgs`);
  expect(orgsRes.ok()).toBeTruthy();
  const orgsBody = (await orgsRes.json()) as { organizations: Array<{ id: string }> };
  const orgId = orgsBody.organizations[0].id;

  const csrfRes = await request.get(`${API_ORIGIN}/auth/csrf`);
  const csrfBody = (await csrfRes.json()) as { csrfToken: string };

  const invitedEmail = `invitee+${Date.now()}@example.com`;
  const inviteRes = await request.post(`${API_ORIGIN}/orgs/${orgId}/invites`, {
    data: { email: invitedEmail },
    headers: { 'x-csrf-token': csrfBody.csrfToken },
  });
  expect(inviteRes.ok()).toBeTruthy();
  const inviteBody = (await inviteRes.json()) as {
    invite: { token: string };
  };
  const token = inviteBody.invite.token;

  // Accept invite as a new user via UI (no prior session)
  await page.goto(`/invite/${encodeURIComponent(token)}`);
  await page.locator('input').first().fill('Invited User');
  await page.locator('input[type="password"]').fill('password1234');
  await page.getByRole('button', { name: '接受邀請' }).click();

  await page.waitForURL('**/orgs');
  await expect(page.getByRole('heading', { name: '你的 Organizations' })).toBeVisible();
  await expect(page.getByText('Demo Org')).toBeVisible();

  // Attempt to accept again should fail (invite used)
  await page.goto(`/invite/${encodeURIComponent(token)}`);
  await page.locator('input').first().fill('Invited User');
  await page.locator('input[type="password"]').fill('password1234');
  await page.getByRole('button', { name: '接受邀請' }).click();

  await expect(page.getByText(/Invite already used/)).toBeVisible();
});
