import { expect, test } from '@playwright/test';

test('enforces role-based navigation and admin calls to action', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('platform-admin@example.com');
  await page.getByLabel('Password').fill('platform-admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('link', { name: 'Platform Admin' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Platform Audit' })).toBeVisible();
  await page.goto('/orgs/org-alpha');
  await expect(page.getByRole('link', { name: 'Manage members' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Manage projects' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Audit log' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Platform org console' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Platform audit', exact: true })).toBeVisible();

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email').fill('org-admin@example.com');
  await page.getByLabel('Password').fill('org-admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('link', { name: 'Organizations' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Platform Admin' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Platform Audit' })).toHaveCount(0);
  await page.goto('/orgs/org-alpha');
  await expect(page.getByRole('link', { name: 'Manage members' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Manage projects' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Audit log' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Platform org console' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Platform audit' })).toHaveCount(0);

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email').fill('developer@example.com');
  await page.getByLabel('Password').fill('developer-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('link', { name: 'Organizations' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Platform Admin' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Platform Audit' })).toHaveCount(0);
  await page.goto('/orgs/org-alpha');
  await expect(page.getByText('without elevated administration controls.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Manage members' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Manage projects' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Audit log' })).toHaveCount(0);
});
