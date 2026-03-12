import { expect, test } from '@playwright/test';

test('visitor cannot access admin pages', async ({ page }) => {
  await page.goto('/admin/analytics');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('body')).toContainText(/Login/i);
});
