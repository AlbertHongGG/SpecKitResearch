import { expect, test } from '@playwright/test';

test('US4: admin updates settings/methods -> order create reflects immediately', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/orders');

  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  const saveSettings = page.waitForResponse((r) =>
    r.url().includes('/api/admin/settings') && r.request().method() === 'PUT' && r.status() === 200,
  );
  await page.getByLabel('default_return_method').selectOption('post_form');
  await page.getByLabel('allowed_currencies (comma separated)').fill('USD');
  await page.getByRole('button', { name: '儲存' }).click();
  await saveSettings;

  await page.goto('/admin/payment-methods');
  await expect(page.getByRole('heading', { name: 'Payment Methods' })).toBeVisible();

  const cardRow = page.locator('tbody tr', { hasText: 'card' }).first();
  const saveMethod = page.waitForResponse((r) =>
    r.url().includes('/api/admin/payment-methods') && r.request().method() === 'PUT' && r.status() === 200,
  );
  await cardRow.locator('input[type="checkbox"]').first().uncheck();
  await cardRow.getByRole('button', { name: 'Save' }).click();
  await saveMethod;

  await page.goto('/orders/new');

  // Wait admin-managed options/defaults applied.
  await expect(page.getByText('載入 Admin 設定中…')).toHaveCount(0);

  const currency = page.getByLabel('currency');
  await expect(currency).toHaveValue('USD');
  await expect(currency.locator('option')).toHaveCount(1);
  await expect(currency.locator('option')).toHaveText(['USD']);

  await expect(page.getByLabel('return_method')).toHaveValue('post_form');
  await expect(page.getByLabel('payment_method_code')).toHaveValue('atm');
});
