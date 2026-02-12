import { test, expect } from '@playwright/test';

import { loginAsUser } from './helpers/auth';

test('reports page shows totals, charts, and empty state', async ({ page }) => {
  await loginAsUser(page);

  await page.goto('/transactions');

  // Expense 120 on 2026-02-01
  await page.getByRole('button', { name: '新增帳務' }).click();
  await page.getByRole('dialog', { name: '新增帳務' }).getByLabel('金額').fill('120');
  await page.getByRole('dialog', { name: '新增帳務' }).getByLabel('日期').fill('2026-02-01');
  await page.getByRole('dialog', { name: '新增帳務' }).getByLabel('類別').selectOption({ label: '食物' });
  await page.getByRole('dialog', { name: '新增帳務' }).getByLabel('備註（可選）').fill('午餐');
  await page.getByRole('dialog', { name: '新增帳務' }).getByRole('button', { name: '新增' }).click();

  // Income 300 on 2026-02-02
  await page.getByRole('button', { name: '新增帳務' }).click();
  await page.getByRole('dialog', { name: '新增帳務' }).getByLabel('收入').click();
  await page.getByRole('dialog', { name: '新增帳務' }).getByLabel('金額').fill('300');
  await page.getByRole('dialog', { name: '新增帳務' }).getByLabel('日期').fill('2026-02-02');
  await page.getByRole('dialog', { name: '新增帳務' }).getByLabel('類別').selectOption({ label: '薪水' });
  await page.getByRole('dialog', { name: '新增帳務' }).getByRole('button', { name: '新增' }).click();

  await page.goto('/reports');

  await expect(page.getByRole('heading', { name: '月報表' })).toBeVisible();

  await page.getByLabel('年份').selectOption('2026');
  await page.getByLabel('月份').selectOption('2');

  // Totals
  await expect(page.getByText('總收入').locator('..')).toContainText('300');
  await expect(page.getByText('總支出').locator('..')).toContainText('120');
  await expect(page.getByText('淨收支').locator('..')).toContainText('180');

  // Charts headings
  await expect(page.getByRole('heading', { name: '支出類別分布' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '每日收支' })).toBeVisible();

  // Fallback tables show data
  await expect(page.getByRole('cell', { name: '食物' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '2026-02-01' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '2026-02-02' })).toBeVisible();

  // Empty month disables export
  await page.getByLabel('月份').selectOption('3');
  await expect(page.getByText('本月無資料', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '匯出 CSV' })).toBeDisabled();
});
