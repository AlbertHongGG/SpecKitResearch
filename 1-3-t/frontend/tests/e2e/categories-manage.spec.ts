import { test, expect } from '@playwright/test';

import { loginAsUser } from './helpers/auth';

test('categories create/edit/toggle active', async ({ page }) => {
  await loginAsUser(page);

  await page.goto('/categories');
  await expect(page.getByRole('heading', { name: '類別' })).toBeVisible();

  await page.getByRole('button', { name: '新增類別' }).click();
  const createDialog = page.getByRole('dialog', { name: '新增類別' });
  await expect(createDialog).toBeVisible();

  await createDialog.getByLabel('名稱').fill('娛樂');
  await createDialog.getByLabel('類型').selectOption({ label: '支出' });
  await createDialog.getByRole('button', { name: '新增' }).click();

  const row = page.getByRole('row').filter({ hasText: '娛樂' });
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: '編輯' }).click();
  const editDialog = page.getByRole('dialog', { name: '編輯類別' });
  await expect(editDialog).toBeVisible();

  await editDialog.getByLabel('名稱').fill('娛樂2');
  await editDialog.getByLabel('類型').selectOption({ label: '兩者皆可' });
  await editDialog.getByRole('button', { name: '儲存' }).click();

  const updatedRow = page.getByRole('row').filter({ hasText: '娛樂2' });
  await expect(updatedRow).toBeVisible();

  const toggle = updatedRow.getByRole('button', { name: '啟用中' });
  await toggle.click();
  await expect(updatedRow.getByRole('button', { name: '已停用' })).toBeVisible();

  await updatedRow.getByRole('button', { name: '已停用' }).click();
  await expect(updatedRow.getByRole('button', { name: '啟用中' })).toBeVisible();
});
