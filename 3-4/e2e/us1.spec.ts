import { expect, test } from '@playwright/test';
import { loginAs } from './_auth';

async function createOrder(page: any, input: { scenario: string; delaySec?: number; webhookUrl?: string }) {
  await page.getByRole('link', { name: 'Create order' }).click();
  await expect(page).toHaveURL(/\/orders\/new/);

  await page.getByLabel('Payment method').selectOption({ value: 'CREDIT_CARD_SIM' });
  await page.getByLabel('Scenario').selectOption({ value: input.scenario });

  if (input.delaySec !== undefined) {
    await page.getByLabel('Delay sec (optional)').fill(String(input.delaySec));
  }

  if (input.webhookUrl) {
    await page.getByLabel('Webhook URL (optional)').fill(input.webhookUrl);
    await page.getByLabel('Webhook delay sec (optional)').fill('0');
  }

  await page.getByRole('button', { name: 'Create & go to pay page' }).click();
  await expect(page).toHaveURL(/\/pay\//);

  const orderNo = new URL(page.url()).pathname.split('/').pop();
  if (!orderNo) throw new Error('Missing orderNo in URL');
  return { orderNo };
}

test('[US1] login -> create -> pay -> detail shows ReturnLog', async ({ page }) => {
  await loginAs(page, 'user@example.com', 'user1234');

  const { orderNo } = await createOrder(page, { scenario: 'success' });

  await page.getByRole('button', { name: 'Simulate' }).click();
  await expect(page).toHaveURL(new RegExp(`/complete/${orderNo}$`));

  await expect(page.getByText('Latest ReturnLog')).toBeVisible();

  await page.goto(`/orders/${orderNo}`);
  await expect(page.getByRole('heading', { name: orderNo })).toBeVisible();
  await expect(page.getByText('No return logs')).toHaveCount(0);
});
