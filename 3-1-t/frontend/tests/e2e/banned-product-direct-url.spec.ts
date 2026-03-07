import { expect, test } from '@playwright/test';

test('banned product direct URL shows unavailable', async ({ page }) => {
  await page.goto('/products/banned-product-id');
  await expect(page.locator('body')).toContainText(/unavailable|not found|error/i);
});
