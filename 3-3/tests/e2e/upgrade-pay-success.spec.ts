import { test, expect } from '@playwright/test';
import { apiLogin, gotoApp, WEB_ORIGIN } from './helpers';

test('upgrade → proration invoice → simulate payment success', async ({ page }) => {
  await apiLogin(page, { email: 'orgadmin@example.com', password: 'orgadmin1234' });

  await gotoApp(page, '/app/subscription');

  await page.getByRole('button', { name: 'Upgrade' }).click();

  const modal = page.locator('div.fixed.inset-0');
  await expect(modal).toBeVisible();

  await modal.locator('select').nth(1).selectOption({ label: 'Pro' });
  await modal.locator('input[type="checkbox"]').check();
  await modal.getByRole('button', { name: 'Confirm' }).click();

  await expect(modal.getByText('Upgrade accepted. Proration invoice created:', { exact: false })).toBeVisible();
  const invoiceId = await modal.locator('span.font-mono').first().innerText();

  await modal.getByRole('button', { name: 'Close' }).click();
  await expect(modal).toBeHidden();

  const invoiceCard = page.locator('div.rounded-2xl').filter({ hasText: invoiceId }).first();
  await expect(invoiceCard).toBeVisible();
  await expect(invoiceCard.getByText('Open')).toBeVisible();

  await invoiceCard.getByRole('button', { name: 'Simulate success' }).click();

  // Avoid strict-mode ambiguity with the "Paid <date>" line.
  await expect(invoiceCard.getByText('Paid', { exact: true })).toBeVisible();

  await expect(page).toHaveURL(/\/app\/subscription$/);
});
