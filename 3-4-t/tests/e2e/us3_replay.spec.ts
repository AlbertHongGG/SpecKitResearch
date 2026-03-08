import { expect, test } from '@playwright/test';

test('US3: replay full_flow does not change terminal order status', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('dev@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/orders');

  await page.getByRole('link', { name: '新增訂單' }).click();
  await page.waitForURL('**/orders/new');

  await page.getByLabel('amount').fill('333');
  await page.getByLabel('callback_url').fill('http://localhost:3000/orders');
  await page.getByLabel('webhook_url (optional)').fill('');
  await page.getByLabel('return_method').selectOption('query_string');
  await page.getByRole('button', { name: '建立並前往付款頁' }).click();

  await page.waitForURL('**/pay/**');
  const orderNo = new URL(page.url()).pathname.split('/').pop();
  expect(orderNo).toBeTruthy();

  await page.getByRole('button', { name: 'Pay' }).click();
  await page.waitForURL('**/orders');

  const row = page.locator('tbody tr', { hasText: orderNo! }).first();
  await row.getByRole('link', { name: '詳情' }).click();
  await page.waitForURL('**/orders/**');

  await expect(page.getByText('paid', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Full flow' }).click();
  await expect(page.getByText('scope: full_flow')).toBeVisible();

  // Still terminal, unchanged.
  await expect(page.getByText('paid', { exact: true })).toBeVisible();
});
