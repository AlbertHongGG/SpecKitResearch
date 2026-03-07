import { expect, test } from '@playwright/test';

test('payment retry flow smoke', async ({ page }) => {
  await page.goto('/payment/result');
  await expect(page.locator('body')).toContainText(/Payment Result/i);
});
