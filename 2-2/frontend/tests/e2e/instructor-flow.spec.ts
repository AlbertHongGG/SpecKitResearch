import { test, expect } from '@playwright/test';

test('instructor page access shows login redirect when not authenticated', async ({ page }) => {
  await page.goto('/instructor/courses');
  await expect(page).toHaveURL(/login/);
});
