import { expect, test } from '@playwright/test';

test('US2: pay -> webhook eventually delivered (receiver verifies signature)', async ({ page, request }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('dev@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('**/orders');
  await page.getByRole('link', { name: '新增訂單' }).click();
  await page.waitForURL('**/orders/new');

  await page.getByLabel('amount').fill('222');
  await page.getByLabel('callback_url').fill('http://localhost:4000/callback');
  await page.getByLabel('webhook_url (optional)').fill('http://localhost:4000/webhook');
  await page.getByLabel('return_method').selectOption('query_string');
  await page.getByRole('button', { name: '建立並前往付款頁' }).click();

  await page.waitForURL('**/pay/**');
  await page.getByRole('button', { name: 'Pay' }).click();

  // Return redirect happens immediately; webhook is async.
  await page.waitForURL('http://localhost:4000/callback**');

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const historyRes = await request.get('http://localhost:4000/history');
    expect(historyRes.ok()).toBeTruthy();
    const history = await historyRes.json();
    const webhook = (history.items ?? []).find((i: any) => i.path === '/webhook');
    if (webhook) {
      expect(webhook.webhook_verification?.ok).toBe(true);
      return;
    }
    await page.waitForTimeout(500);
  }

  throw new Error('webhook not received within timeout (is worker running?)');
});
