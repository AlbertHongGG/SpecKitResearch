import { expect, test } from '@playwright/test';

test('login respects returnTo=/orgs', async ({ page }) => {
  await page.goto('/login?returnTo=%2Forgs');

  await page.locator('input[autocomplete="email"]').fill('admin@example.com');
  await page.locator('input[type="password"][autocomplete="current-password"]').fill('password1234');
  await page.getByRole('button', { name: '登入' }).click();

  await page.waitForURL('**/orgs');
  await expect(page.getByRole('heading', { name: '你的 Organizations' })).toBeVisible();
});
