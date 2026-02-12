import { test, expect } from '@playwright/test';

import { loginAsUser } from './helpers/auth';

test('happy path full flow: register → add transaction → report → export', async ({ page }) => {
  await loginAsUser(page);

  // Add a transaction
  await page.goto('/transactions');
  await expect(page.getByRole('heading', { name: '帳務' })).toBeVisible();

  await page.getByRole('button', { name: '新增帳務' }).click();
  await expect(page.getByRole('dialog', { name: '新增帳務' })).toBeVisible();

  await page.getByLabel('金額').fill('120');
  await page.getByLabel('日期').fill('2026-02-01');
  await page.getByLabel('類別').selectOption({ label: '食物' });
  await page.getByLabel('備註（可選）').fill('午餐');

  await page
    .getByRole('dialog', { name: '新增帳務' })
    .getByRole('button', { name: '新增' })
    .click();

  const group = page.getByLabel('帳務 2026-02-01');
  await expect(group).toBeVisible();

  // Navigate to report page
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: '月報表' })).toBeVisible();

  await page.getByLabel('年份').selectOption('2026');
  await page.getByLabel('月份').selectOption('2');

  // Totals should reflect the created transaction
  const expenseCard = page.getByText('總支出').locator('..');
  await expect(expenseCard).toBeVisible();
  await expect(expenseCard.getByText('120', { exact: true })).toBeVisible();

  const incomeCard = page.getByText('總收入').locator('..');
  await expect(incomeCard).toBeVisible();

  // Export CSV
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '匯出 CSV' }).click();
  const download = await downloadPromise;

  await expect(download.suggestedFilename()).toBe('transactions_2026_02.csv');
});
