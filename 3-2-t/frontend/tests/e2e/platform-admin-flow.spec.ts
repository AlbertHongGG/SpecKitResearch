import { expect, test } from '@playwright/test';

test('supports platform org creation and org admin project governance', async ({ page }) => {
  const runId = Date.now().toString().slice(-6);
  const organizationName = `Delta Organization ${runId}`;
  const projectKey = `A${runId.slice(-3)}`;
  const projectName = `Admin Flow Project ${runId}`;

  await page.goto('/platform/orgs');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fplatform%2Forgs/);

  await page.getByLabel('Email').fill('platform-admin@example.com');
  await page.getByLabel('Password').fill('platform-admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/platform\/orgs/);
  await page.getByLabel('Organization name').fill(organizationName);
  await page.getByLabel('Organization plan').selectOption('paid');
  await page.getByRole('button', { name: 'Create organization' }).click();
  await expect(page.getByRole('heading', { name: organizationName })).toBeVisible();

  await page.context().clearCookies();
  await page.goto('/login');

  await page.getByLabel('Email').fill('org-admin@example.com');
  await page.getByLabel('Password').fill('org-admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto('/orgs/org-alpha/members');
  await page.getByLabel('Invite member email').fill('platform-flow@example.com');
  await page.getByRole('button', { name: 'Send invite' }).click();
  await expect(page.getByText('Current members')).toBeVisible();

  await page.goto('/orgs/org-alpha/projects');
  await page.getByLabel('Project key').fill(projectKey);
  await page.getByLabel('Project name').fill(projectName);
  await page.getByLabel('Project type').selectOption('kanban');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText(`${projectKey} · ${projectName}`)).toBeVisible();
});
