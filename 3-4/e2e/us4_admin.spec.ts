import { expect, test } from '@playwright/test';
import { loginAs } from './_auth';

async function logout(page: any) {
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login/);
}

test('[US4] admin disables payment method -> user cannot select it', async ({ page }) => {
  await loginAs(page, 'admin@example.com', 'admin1234');

  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('link', { name: 'Payment methods' }).click();
  await expect(page).toHaveURL(/\/admin\/payment-methods/);

  const row = page.locator('tbody tr', { hasText: 'CREDIT_CARD_SIM' });
  await expect(row).toBeVisible();

  // Disable
  await row.getByRole('button', { name: 'Toggle' }).click();
  await expect(row.getByText('false')).toBeVisible();

  await logout(page);

  await loginAs(page, 'user@example.com', 'user1234');
  await page.getByRole('link', { name: 'Create order' }).click();
  await expect(page).toHaveURL(/\/orders\/new/);

  const select = page.getByLabel('Payment method');
  const options = await select.locator('option').allTextContents();
  expect(options.join('\n')).not.toContain('CREDIT_CARD_SIM');

  // Re-enable to keep the DB usable for follow-up tests.
  await logout(page);
  await loginAs(page, 'admin@example.com', 'admin1234');
  await page.getByRole('link', { name: 'Admin' }).click();
  await page.getByRole('link', { name: 'Payment methods' }).click();

  const row2 = page.locator('tbody tr', { hasText: 'CREDIT_CARD_SIM' });
  await row2.getByRole('button', { name: 'Toggle' }).click();
  await expect(row2.getByText('true')).toBeVisible();
});
