import { expect, test } from '@playwright/test';

test('admin force refund smoke', async ({ page }) => {
  await page.goto('/admin/refunds');
  await expect(page.locator('body')).toContainText(/Admin Refunds/i);
});
