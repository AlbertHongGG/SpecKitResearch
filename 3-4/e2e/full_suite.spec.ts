import { expect, test } from '@playwright/test';
import { loginAs } from './_auth';

test('[E2E] full suite smoke (US1~US4)', async ({ page }) => {
  // User flow (US1)
  await loginAs(page, 'user@example.com', 'user1234');

  await page.getByRole('link', { name: 'Create order' }).click();
  await page.getByLabel('Payment method').selectOption({ value: 'CREDIT_CARD_SIM' });
  await page.getByLabel('Scenario').selectOption({ value: 'success' });
  await page.getByRole('button', { name: 'Create & go to pay page' }).click();
  await expect(page).toHaveURL(/\/pay\//);

  const orderNo = new URL(page.url()).pathname.split('/').pop();
  if (!orderNo) throw new Error('Missing orderNo');

  await page.getByRole('button', { name: 'Simulate' }).click();
  await expect(page).toHaveURL(new RegExp(`/complete/${orderNo}$`));
  await expect(page.getByText('Latest ReturnLog')).toBeVisible();

  // Webhook endpoints page loads
  await page.getByRole('link', { name: 'Webhooks' }).click();
  await expect(page.getByRole('heading', { name: 'Webhook endpoints' })).toBeVisible();

  // Switch to admin and ensure admin pages load (US4)
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);

  await loginAs(page, 'admin@example.com', 'admin1234');

  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('link', { name: 'Scenario templates' }).click();
  await expect(page.getByRole('heading', { name: 'Scenario templates' })).toBeVisible();
  await expect(page.locator('tbody tr').first()).toBeVisible();
});
