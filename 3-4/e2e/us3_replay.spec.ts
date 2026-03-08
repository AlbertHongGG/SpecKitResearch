import { expect, test } from '@playwright/test';
import http from 'node:http';

import { loginAs } from './_auth';

test('[US3] resend + replay add logs and replay run', async ({ page }) => {
  const received: Array<{ url: string; body: string }> = [];

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      received.push({ url: req.url ?? '', body });
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('Unexpected server address');
  const webhookUrl = `http://127.0.0.1:${addr.port}/webhook`;

  try {
    await loginAs(page, 'user@example.com', 'user1234');

    await page.getByRole('link', { name: 'Create order' }).click();
    await expect(page).toHaveURL(/\/orders\/new/);

    await page.getByLabel('Webhook URL (optional)').fill(webhookUrl);
    await page.getByLabel('Webhook delay sec (optional)').fill('0');
    await page.getByLabel('Payment method').selectOption({ value: 'CREDIT_CARD_SIM' });
    await page.getByLabel('Scenario').selectOption({ value: 'success' });

    await page.getByRole('button', { name: 'Create & go to pay page' }).click();
    await expect(page).toHaveURL(/\/pay\//);

    const orderNo = new URL(page.url()).pathname.split('/').pop();
    if (!orderNo) throw new Error('Missing orderNo in URL');

    await page.getByRole('button', { name: 'Simulate' }).click();
    await expect(page).toHaveURL(new RegExp(`/complete/${orderNo}$`));
    await expect(page.getByText('Latest ReturnLog')).toBeVisible();

    await expect
      .poll(() => received.length, { timeout: 20_000 })
      .toBeGreaterThan(0);

    await page.goto(`/orders/${orderNo}`);
    await expect(page.getByRole('heading', { name: orderNo })).toBeVisible();

    const webhookRows = page.locator('section:has-text("Webhook logs") tbody tr');
    const before = await webhookRows.count();

    await page.getByRole('button', { name: 'Resend webhook' }).click();

    await expect
      .poll(() => received.length, { timeout: 20_000 })
      .toBeGreaterThan(1);

    await expect(webhookRows).toHaveCount(before + 1);

    await page.getByRole('button', { name: 'Replay full flow' }).click();

    const replayRunsSection = page.locator('section:has-text("Replay runs")');
    await expect(replayRunsSection.getByText('No replay runs')).toHaveCount(0);
    await expect(replayRunsSection.locator('li')).toHaveCount(1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
