import { expect, test } from '@playwright/test';

test('US1: login -> create order -> pay -> receiver gets callback', async ({ page, request }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('dev@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('**/orders');
  await page.getByRole('link', { name: '新增訂單' }).click();
  await page.waitForURL('**/orders/new');

  await page.getByLabel('amount').fill('123');
  await page.getByLabel('callback_url').fill('http://localhost:4000/callback');
  await page.getByLabel('webhook_url (optional)').fill('');
  await page.getByLabel('return_method').selectOption('query_string');
  await page.getByRole('button', { name: '建立並前往付款頁' }).click();

  await page.waitForURL('**/pay/**');
  await page.getByRole('button', { name: 'Pay' }).click();

  await page.waitForURL('http://localhost:4000/callback**');
  await expect(page.getByRole('heading', { name: 'Receiver: /callback' })).toBeVisible();

  const historyRes = await request.get('http://localhost:4000/history');
  expect(historyRes.ok()).toBeTruthy();
  const history = await historyRes.json();
  expect(Array.isArray(history.items)).toBe(true);
  expect(history.items.length).toBeGreaterThan(0);
  const latest = history.items[0];
  expect(latest.path).toBe('/callback');
  expect(latest.query?.order_no || latest.body?.order_no).toBeTruthy();
  expect(latest.query?.status || latest.body?.status).toBe('paid');
});
