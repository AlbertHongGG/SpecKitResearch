import { expect, test } from '@playwright/test';

test('shows platform and organization audit logs with filters', async ({ page }) => {
  const runId = Date.now().toString().slice(-6);

  await page.goto('/platform/orgs');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fplatform%2Forgs/);
  await page.getByLabel('Email').fill('platform-admin@example.com');
  await page.getByLabel('Password').fill('platform-admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/platform\/orgs/);

  const alphaOrgCard = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Alpha Organization' }) }).first();
  await alphaOrgCard.getByRole('button', { name: 'Suspend' }).click();

  await page.goto('/platform/audit?action=organization_suspended');
  await expect(page.getByRole('heading', { name: 'Platform audit stream' })).toBeVisible();
  await expect(page.locator('strong', { hasText: 'organization_suspended' }).first()).toBeVisible();

  await page.goto('/platform/orgs');
  await alphaOrgCard.getByRole('button', { name: 'Reactivate' }).click();

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email').fill('org-admin@example.com');
  await page.getByLabel('Password').fill('org-admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto('/orgs/org-alpha/members');
  await page.getByLabel('Invite member email').fill(`audit-${runId}@example.com`);
  await page.getByRole('button', { name: 'Send invite' }).click();

  await page.goto('/orgs/org-alpha/audit?action=member_invited');
  await expect(page.getByRole('heading', { name: 'Organization audit log' })).toBeVisible();
  await expect(page.locator('strong', { hasText: 'member_invited' }).first()).toBeVisible();
});
