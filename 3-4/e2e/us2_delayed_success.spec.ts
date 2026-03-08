import { expect, test } from '@playwright/test';
import { loginAs } from './_auth';

test('[US2] delayed_success eventually produces ReturnLog', async ({ page }) => {
  await loginAs(page, 'user@example.com', 'user1234');

  await page.getByRole('link', { name: 'Create order' }).click();
  await expect(page).toHaveURL(/\/orders\/new/);

  await page.getByLabel('Payment method').selectOption({ value: 'CREDIT_CARD_SIM' });
  await page.getByLabel('Scenario').selectOption({ value: 'delayed_success' });
  await page.getByRole('spinbutton', { name: 'Delay sec (optional)', exact: true }).fill('2');

  await page.getByRole('button', { name: 'Create & go to pay page' }).click();
  await expect(page).toHaveURL(/\/pay\//);

  const orderNo = new URL(page.url()).pathname.split('/').pop();
  if (!orderNo) throw new Error('Missing orderNo in URL');

  await page.getByRole('button', { name: 'Simulate' }).click();
  await expect(page).toHaveURL(new RegExp(`/complete/${orderNo}$`));

  await expect(page.getByText('Waiting for return log')).toBeVisible();
  await expect(page.getByText('Latest ReturnLog')).toBeVisible({ timeout: 20_000 });
});
