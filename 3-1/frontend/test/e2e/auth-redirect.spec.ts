import { test, expect } from '@playwright/test';

test('unauthenticated user is redirected to /login', async ({ page }) => {
  await page.goto('/cart');
  await expect(page).toHaveURL(/\/login/);
});
