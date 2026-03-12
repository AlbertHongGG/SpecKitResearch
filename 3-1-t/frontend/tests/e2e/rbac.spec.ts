import { expect, test } from '@playwright/test';

test('visitor cannot access seller pages', async ({ page }) => {
  await page.goto('/seller/products');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('body')).toContainText(/Login/i);
});
