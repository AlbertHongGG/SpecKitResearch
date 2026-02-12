import { test, expect } from '@playwright/test';

import { loginAsUser } from './helpers/auth';

test('create transaction shows grouped list + daily totals', async ({ page }) => {
  await loginAsUser(page);

  await page.goto('/transactions');

  await expect(page.getByRole('heading', { name: '帳務' })).toBeVisible();

  await page.getByRole('button', { name: '新增帳務' }).click();

  await expect(page.getByRole('dialog', { name: '新增帳務' })).toBeVisible();

  // Default is expense.
  await page.getByLabel('金額').fill('120');
  await page.getByLabel('日期').fill('2026-02-01');
  await page.getByLabel('類別').selectOption({ label: '食物' });
  await page.getByLabel('備註（可選）').fill('午餐');

  await page.getByRole('dialog', { name: '新增帳務' }).getByRole('button', { name: '新增' }).click();

  // Group header + totals
  const group = page.getByLabel('帳務 2026-02-01');
  await expect(group).toBeVisible();
  await expect(page.getByText('2026-02-01')).toBeVisible();
  await expect(page.getByLabel('當日支出')).toContainText('120');

  // Row content
  await expect(group.getByText('食物')).toBeVisible();
  await expect(group.getByText('支出 · 午餐')).toBeVisible();
});
