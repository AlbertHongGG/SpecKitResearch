import { test, expect } from '@playwright/test';

import { acceptNextDialog, login } from './helpers';

test('US2：instructor create → edit curriculum → submit', async ({ page }) => {
  await login(page, {
    email: 'instructor@example.com',
    password: 'password123',
    next: '/instructor/courses/new',
  });

  const title = `E2E Course ${Date.now()}`;

  await page.getByText('標題').locator('..').locator('input').fill(title);
  await page.getByText('描述').locator('..').locator('textarea').fill('E2E description');
  await page.getByText('價格').locator('..').locator('input').fill('100');
  await page.locator('select').selectOption({ label: 'General' });

  await page.getByRole('button', { name: '建立' }).click();
  await expect(page).toHaveURL(/\/instructor\/courses\//);

  await page.getByRole('link', { name: '編輯課綱' }).click();
  await expect(page).toHaveURL(/\/curriculum$/);

  await page.getByRole('button', { name: '+ 新增章節' }).click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('input[value="New Section"]')).toHaveCount(1);

  await page.getByRole('button', { name: '+ 新增單元' }).click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('input[value="New Lesson"]')).toHaveCount(1);

  await page.getByRole('link', { name: '← 回課程編輯' }).click();

  await acceptNextDialog(page);
  await page.getByRole('button', { name: '提交審核' }).click();

  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByText('狀態：submitted')).toBeVisible();
});
