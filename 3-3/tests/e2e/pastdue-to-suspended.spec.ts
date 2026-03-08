import { test, expect } from '@playwright/test';
import { apiLogin, apiRunGraceExpirationJob, gotoApp } from './helpers';

test('payment fail → PastDue → grace expiry → Suspended', async ({ page }) => {
  // Org admin triggers a PastDue by failing the proration invoice
  await apiLogin(page, { email: 'pastdueadmin@example.com', password: 'pastdueadmin1234' });
  await gotoApp(page, '/app/subscription');

  await page.getByRole('button', { name: 'Upgrade' }).click();

  const modal = page.locator('div.fixed.inset-0');
  await expect(modal).toBeVisible();
  await modal.locator('select').nth(1).selectOption({ label: 'Pro' });
  await modal.locator('input[type="checkbox"]').check();
  await modal.getByRole('button', { name: 'Confirm' }).click();

  const invoiceId = await modal.locator('span.font-mono').first().innerText();
  await modal.getByRole('button', { name: 'Close' }).click();

  const invoiceCard = page.locator('div.rounded-2xl').filter({ hasText: invoiceId }).first();
  await expect(invoiceCard.getByText('Open')).toBeVisible();

  await invoiceCard.getByRole('button', { name: 'Simulate fail' }).click();

  // Subscription summary should show PastDue
  await expect(page.getByText(/PastDue\s*•/)).toBeVisible();

  // Trigger grace-expiration job with a future "now" to move PastDue → Suspended.
  await apiLogin(page, { email: 'admin@example.com', password: 'admin1234' });
  const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
  await apiRunGraceExpirationJob(page, future);

  // Log back in as org admin and verify Suspended is visible
  await apiLogin(page, { email: 'pastdueadmin@example.com', password: 'pastdueadmin1234' });
  await gotoApp(page, '/app/subscription');
  await expect(page.getByText(/Suspended\s*•/)).toBeVisible();
});
