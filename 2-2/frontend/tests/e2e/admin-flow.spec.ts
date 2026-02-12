import { test, expect } from '@playwright/test';

test('admin review page requires authentication', async ({ page }) => {
  await page.goto('/admin/review');
  await expect(page).toHaveURL(/login|403/);
});
