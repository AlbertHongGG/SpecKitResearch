import { expect, test } from '@playwright/test';

test('buyer checkout flow smoke', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page).toHaveURL(/\/checkout/);
});
