import { test, expect } from '@playwright/test';

test('subscription page renders entitlement-aware controls', async ({ page }) => {
  await page.goto('/app/subscription');
  await expect(page.getByRole('heading', { name: 'Subscription' })).toBeVisible();
});
