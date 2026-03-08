import { test, expect } from '@playwright/test';

test('admin dashboard route works', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
});
