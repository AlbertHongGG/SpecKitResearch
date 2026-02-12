import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

import { loginAsUser } from './helpers/auth';

test('reports page exports monthly CSV when month has data', async ({ page }, testInfo) => {
  await loginAsUser(page);

  await page.goto('/transactions');

  await page.getByRole('button', { name: '新增帳務' }).click();
  await page.getByRole('dialog', { name: '新增帳務' }).getByLabel('金額').fill('120');
  await page.getByRole('dialog', { name: '新增帳務' }).getByLabel('日期').fill('2026-02-01');
  await page.getByRole('dialog', { name: '新增帳務' }).getByLabel('類別').selectOption({ label: '食物' });
  await page.getByRole('dialog', { name: '新增帳務' }).getByRole('button', { name: '新增' }).click();

  await page.goto('/reports');

  await page.getByLabel('年份').selectOption('2026');
  await page.getByLabel('月份').selectOption('2');

  const exportButton = page.getByRole('button', { name: '匯出 CSV' });
  await expect(exportButton).toBeEnabled();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportButton.click(),
  ]);

  expect(download.suggestedFilename()).toBe('transactions_2026_02.csv');

  const savePath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(savePath);

  const content = await fs.readFile(savePath, 'utf-8');
  expect(content.charCodeAt(0)).toBe(0xfeff);
  expect(content).toContain('日期,類型,類別,金額,備註');
});
