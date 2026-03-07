import { expect, test } from '@playwright/test';

test('admin approve seller smoke', async ({ page }) => {
  await page.goto('/admin/seller-applications');
  await expect(page.locator('body')).toContainText(/Seller Applications/i);
});
