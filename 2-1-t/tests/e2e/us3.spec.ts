import { test, expect } from '@playwright/test';

import { acceptNextDialog, login } from './helpers';

test('US3：admin review + taxonomy/users + stats smoke', async ({ page }) => {
  // Prepare a submitted course as instructor
  await login(page, {
    email: 'instructor@example.com',
    password: 'password123',
    next: '/instructor/courses/new',
  });

  const title = `E2E Review ${Date.now()}`;

  await page.getByText('標題').locator('..').locator('input').fill(title);
  await page.getByText('描述').locator('..').locator('textarea').fill('Need review');
  await page.getByText('價格').locator('..').locator('input').fill('200');
  await page.locator('select').selectOption({ label: 'General' });
  await page.getByRole('button', { name: '建立' }).click();
  await expect(page).toHaveURL(/\/instructor\/courses\//);

  await acceptNextDialog(page);
  await page.getByRole('button', { name: '提交審核' }).click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByText('狀態：submitted')).toBeVisible();

  // Admin reviews
  await login(page, {
    email: 'admin@example.com',
    password: 'password123',
    next: '/admin/review',
  });

  const card = page.locator('div', { hasText: title }).first();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: '審核' }).click();

  await page.getByText(`審核：${title}`).waitFor();
  await page.getByRole('button', { name: '核准上架' }).click();

  await expect(page.getByText('已核准上架')).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);

  // Taxonomy create category
  const catName = `E2E Cat ${Date.now()}`;
  await page.goto('/admin/taxonomy/categories');
  await page.getByText('新增分類').waitFor();
  await page.locator('input[placeholder="名稱"]').first().fill(catName);
  await page.getByRole('button', { name: '新增' }).first().click();
  await expect(page.locator(`input[value="${catName}"]`)).toHaveCount(1);

  // Users + stats pages load
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: '使用者管理' })).toBeVisible();
  await expect(page.getByText('admin@example.com')).toBeVisible();

  await page.goto('/admin/stats');
  await expect(page.getByRole('heading', { name: '平台統計' })).toBeVisible();
});
