import { test, expect } from '@playwright/test';
import { login, seedUsers } from './helpers';

test('US4: instructor can create a draft course and submit for review', async ({ page }) => {
  await login(page, { ...seedUsers.instructor, redirectTo: '/instructor/courses' });

  await expect(page.getByRole('heading', { name: '我的課程（教師）' })).toBeVisible();

  const uniqueTitle = `E2E 課程 ${Date.now()}`;

  await page.getByLabel('標題').fill(uniqueTitle);
  await page.getByLabel('簡介').fill('E2E 自動化測試課程');
  await page.getByLabel('價格').fill('0');
  await page.getByRole('button', { name: '建立' }).click();

  await expect(page.getByRole('heading', { name: '編輯課程' })).toBeVisible();
  await expect(page.getByText('狀態：draft')).toBeVisible();

  await page.getByRole('button', { name: '提交審核' }).click();
  await expect(page.getByText('狀態：submitted')).toBeVisible();
});
