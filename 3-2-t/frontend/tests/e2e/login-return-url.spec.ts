import { expect, test } from '@playwright/test';

test('redirects to login and returns to the requested page after sign-in', async ({ page }) => {
  await page.goto('/orgs');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Forgs/);

  await page.getByLabel('Email').fill('org-admin@example.com');
  await page.getByLabel('Password').fill('org-admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/orgs/);
  await expect(page.getByText('Alpha Organization')).toBeVisible();
});
