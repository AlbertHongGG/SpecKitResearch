import { test, expect } from '@playwright/test';

import { loginAsUser } from './helpers/auth';

test('editing transaction date moves groups', async ({ page }) => {
  await loginAsUser(page);

  await page.goto('/transactions');

  await page.getByRole('button', { name: '新增帳務' }).click();
  await expect(page.getByRole('dialog', { name: '新增帳務' })).toBeVisible();

  await page.getByLabel('金額').fill('120');
  await page.getByLabel('日期').fill('2026-02-01');
  await page.getByLabel('類別').selectOption({ label: '食物' });
  await page.getByLabel('備註（可選）').fill('午餐');
  await page.getByRole('dialog', { name: '新增帳務' }).getByRole('button', { name: '新增' }).click();

  const groupA = page.getByLabel('帳務 2026-02-01');
  await expect(groupA).toBeVisible();

  await groupA.getByRole('button', { name: '編輯' }).click();
  const editDialog = page.getByRole('dialog', { name: '編輯帳務' });
  await expect(editDialog).toBeVisible();

  await page.getByLabel('日期').fill('2026-02-02');

  const putResponsePromise = page.waitForResponse((res) => {
    const req = res.request();
    return req.method() === 'PUT' && /\/transactions\/[0-9a-f-]{36}$/i.test(res.url());
  });

  await editDialog.getByRole('button', { name: '儲存' }).click();

  const putResponse = await putResponsePromise;
  if (!putResponse.ok()) {
    const body = await putResponse.text().catch(() => '<unreadable>');
    throw new Error(`PUT /transactions failed: ${putResponse.status()} ${putResponse.statusText()} ${body}`);
  }

  await expect(editDialog).toHaveCount(0);

  const groupB = page.getByLabel('帳務 2026-02-02');
  await expect(groupB).toBeVisible({ timeout: 10_000 });
  await expect(groupB.getByText('食物')).toBeVisible();

  await expect(page.getByLabel('帳務 2026-02-01')).toHaveCount(0);
});
