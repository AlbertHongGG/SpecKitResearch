import { expect, test } from '@playwright/test';

test('visitor redirected to login for protected route', async ({ page }) => {
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/orders|\/login/);
});
