import { expect, test } from '@playwright/test';

import { ensureGuest } from './helpers/auth';

test.describe('auth redirect', () => {
  test('guest visiting protected routes is redirected to /login', async ({ page }) => {
    await ensureGuest(page);

    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/reports');
    await expect(page).toHaveURL(/\/login$/);
  });
});
