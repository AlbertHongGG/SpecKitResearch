import { expect, test } from '@playwright/test';

test('partial out of stock checkout flow smoke', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.locator('body')).toContainText(/Checkout/i);
});
