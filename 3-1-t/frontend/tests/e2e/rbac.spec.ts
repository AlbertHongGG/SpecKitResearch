import { expect, test } from '@playwright/test';

test('rbac route smoke', async ({ page }) => {
  await page.goto('/seller/products');
  await expect(page.locator('body')).toBeVisible();
});
