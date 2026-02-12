import { test, expect } from '@playwright/test';

test('student can view courses list', async ({ page }) => {
  await page.goto('/courses');
  await expect(page.getByRole('heading', { name: '課程列表' })).toBeVisible();
});
