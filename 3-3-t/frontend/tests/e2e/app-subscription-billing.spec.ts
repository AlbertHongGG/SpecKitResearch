import { test, expect } from '@playwright/test';

test('pricing page opens', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByText('Pricing')).toBeVisible();
});
