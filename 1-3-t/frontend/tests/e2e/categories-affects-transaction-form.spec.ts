import { test, expect } from '@playwright/test';

import { loginAsUser } from './helpers/auth';

test('disabled category not selectable in transaction form', async ({ page }) => {
  await loginAsUser(page);

  const name = '停用測試';

  await page.goto('/categories');
  await page.getByRole('button', { name: '新增類別' }).click();

  const dialog = page.getByRole('dialog', { name: '新增類別' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('名稱').fill(name);
  await dialog.getByLabel('類型').selectOption({ label: '支出' });
  await dialog.getByRole('button', { name: '新增' }).click();

  const row = page.getByRole('row').filter({ hasText: name });
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: '啟用中' }).click();
  await expect(row.getByRole('button', { name: '已停用' })).toBeVisible();

  await page.goto('/transactions');
  await page.getByRole('button', { name: '新增帳務' }).click();

  const txDialog = page.getByRole('dialog', { name: '新增帳務' });
  await expect(txDialog).toBeVisible();

  const select = txDialog.getByLabel('類別');
  await expect(select.locator('option', { hasText: name })).toHaveCount(0);
});
