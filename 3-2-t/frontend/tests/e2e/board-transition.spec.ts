import { expect, test } from '@playwright/test';

test('moves a backlog issue to the next board column', async ({ page }) => {
  await page.goto('/projects/project-alpha/board');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fprojects%2Fproject-alpha%2Fboard/);

  await page.getByLabel('Email').fill('developer@example.com');
  await page.getByLabel('Password').fill('developer-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/projects\/project-alpha\/board/);
  await expect(page.getByText('Board transition interactions')).toBeVisible();

  await page.getByRole('button', { name: 'Move ALPHA-2 to Done' }).click();

  const doneColumn = page.getByRole('region', { name: 'Done column' });
  await expect(doneColumn.getByText('Board transition interactions')).toBeVisible();
});
