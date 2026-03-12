import { expect, test } from '@playwright/test';

test('creates a sprint, activates it, and adds a backlog issue into it', async ({ page }) => {
  await page.goto('/projects/project-alpha/sprints');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fprojects%2Fproject-alpha%2Fsprints/);

  await page.getByLabel('Email').fill('org-admin@example.com');
  await page.getByLabel('Password').fill('org-admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/projects\/project-alpha\/sprints/);

  const sprintOneCard = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Sprint 1' }) }).first();
  await sprintOneCard.getByRole('button', { name: 'Close Sprint 1' }).click();
  await expect(sprintOneCard.getByText('closed', { exact: true })).toBeVisible();
  await page.getByLabel('Sprint name').fill('Sprint 2');
  await page.getByLabel('Sprint goal').fill('Validate scrum sprint workflow');
  await page.getByRole('button', { name: 'Create sprint' }).click();
  const sprintTwoCard = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Sprint 2' }) }).first();
  await expect(sprintTwoCard).toBeVisible({ timeout: 10000 });
  await sprintTwoCard.getByRole('button', { name: 'Start Sprint 2' }).click();

  await page.goto('/projects/project-alpha/backlog');
  await page.getByLabel('Issue title').fill('Sprint 2 planning card');
  await page.getByLabel('Description').fill('This issue should appear inside Sprint 2.');
  await page.getByLabel('Sprint').selectOption({ label: 'Sprint 2' });
  await page.getByRole('button', { name: 'Create backlog issue' }).click();

  await expect(page.getByText('Sprint 2 planning card')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sprint 2' })).toBeVisible();
});
