import { expect, test } from '@playwright/test';

test('seller products smoke', async ({ page }) => {
  await page.goto('/seller/products');
  await expect(page.locator('body')).toContainText(/Seller Products/i);
});
