import { test, expect } from '@playwright/test';

import { loginAsUser } from './helpers/auth';

test('delete confirm cancel does nothing (and confirm deletes last item)', async ({ page }) => {
  await loginAsUser(page);

  await page.goto('/transactions');

  await page.getByRole('button', { name: '新增帳務' }).click();
  await expect(page.getByRole('dialog', { name: '新增帳務' })).toBeVisible();

  await page.getByLabel('金額').fill('120');
  await page.getByLabel('日期').fill('2026-02-01');
  await page.getByLabel('類別').selectOption({ label: '食物' });
  await page.getByRole('dialog', { name: '新增帳務' }).getByRole('button', { name: '新增' }).click();

  const group = page.getByLabel('帳務 2026-02-01');
  await expect(group).toBeVisible();

  // Cancel delete keeps the item.
  await group.getByRole('button', { name: '刪除' }).click();
  const deleteDialog = page.getByRole('dialog', { name: '刪除帳務' });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole('button', { name: '取消' }).click();
  await expect(deleteDialog).toHaveCount(0);
  await expect(group.getByText('食物')).toBeVisible();

  // Confirm delete removes the last item and shows empty state.
  await group.getByRole('button', { name: '刪除' }).click();
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole('button', { name: '刪除' }).click();

  await expect(page.getByText('目前沒有帳務。')).toBeVisible();
});
