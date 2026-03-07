import { expect, test } from '@playwright/test';

test('seller fulfillment and refunds smoke', async ({ page }) => {
  await page.goto('/seller/orders');
  await expect(page.locator('body')).toContainText(/Seller Orders/i);
});
