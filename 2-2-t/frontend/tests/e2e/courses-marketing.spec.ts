import { test, expect } from '@playwright/test';

test('US1: guest can browse published courses and see 404 for missing course', async ({ page }) => {
  await page.goto('/courses');

  await expect(page.getByRole('heading', { name: '課程' })).toBeVisible();

  // Seeded course should exist.
  await expect(page.getByText('入門 TypeScript（文字版）')).toBeVisible();
  await page.getByText('入門 TypeScript（文字版）').click();

  await expect(page.getByRole('heading', { name: '入門 TypeScript（文字版）' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '課綱' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '購買' })).toBeVisible();

  // Unknown course should be rendered as NotFound page.
  await page.goto('/courses/does-not-exist');
  await expect(page.getByRole('heading', { name: '404 找不到頁面' })).toBeVisible();
});
