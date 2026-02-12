import { test, expect } from '@playwright/test';

test('US2: unauthenticated user is redirected to login with redirect param', async ({ page }) => {
  await page.goto('/my-courses');

  await expect(page).toHaveURL(/\/login\?redirect=%2Fmy-courses/);
  await expect(page.getByRole('heading', { name: '登入' })).toBeVisible();
});
