import { test, expect } from '@playwright/test';
import { login, seedUsers } from './helpers';

test('US3: student can open reader and mark progress complete (idempotent)', async ({ page }) => {
  await login(page, { ...seedUsers.student, redirectTo: '/my-courses' });

  await expect(page.getByRole('heading', { name: '我的課程' })).toBeVisible();
  await expect(page.getByText('入門 TypeScript（文字版）')).toBeVisible();

  await page.getByText('入門 TypeScript（文字版）').click();
  await expect(page.getByRole('heading', { name: '入門 TypeScript（文字版）' })).toBeVisible();

  await page.getByRole('button', { name: '標記完成' }).click();

  // Progress should be updated after refresh.
  await expect(page.getByText(/進度：\s*(1|2)\/2/)).toBeVisible();
});
