import { expect, test } from '@playwright/test';

test('shows read-only enforcement for suspended orgs and archived projects', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('platform-admin@example.com');
  await page.getByLabel('Password').fill('platform-admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.goto('/platform/orgs');
  const alphaOrgCard = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Alpha Organization' }) }).first();
  await alphaOrgCard.getByRole('button', { name: 'Suspend' }).click();
  await expect(page.getByText('suspended', { exact: true }).first()).toBeVisible();

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email').fill('org-admin@example.com');
  await page.getByLabel('Password').fill('org-admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto('/orgs/org-alpha/projects');
  await expect(page.getByText('Organization suspended')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create project' })).toBeDisabled();

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email').fill('platform-admin@example.com');
  await page.getByLabel('Password').fill('platform-admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.goto('/platform/orgs');
  await alphaOrgCard.getByRole('button', { name: 'Reactivate' }).click();

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email').fill('org-admin@example.com');
  await page.getByLabel('Password').fill('org-admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto('/orgs/org-beta/projects');
  await expect(page.getByText('Project archived')).toBeVisible();

  await page.goto('/projects/project-beta-archive/issues/BETA-1');
  await expect(page.getByText('Read-only mode', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save issue' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Add comment' })).toBeDisabled();
});
