import { expect, test } from '@playwright/test';

test('admin nav pages smoke', async ({ page }) => {
  await page.goto('/admin/analytics');
  await expect(page.locator('body')).toContainText(/Admin Analytics/i);
});
