import { test, expect } from '@playwright/test';
import { apiLogin, apiSetActiveOrg, API_ORIGIN, gotoApp, WEB_ORIGIN } from './helpers';

test('org switch + END_USER cannot manage + IDOR blocked', async ({ page }) => {
  const ORG_A = 'org-a';
  const ORG_B = 'org-b';

  await apiLogin(page, { email: 'multi@example.com', password: 'multi1234' });

  // Switch to ORG_B where this user is ORG_ADMIN and can manage.
  await apiSetActiveOrg(page, ORG_B);
  await gotoApp(page, '/app/subscription');
  await expect(page.getByRole('button', { name: 'Upgrade' })).toBeEnabled();

  // Create an invoice in ORG_B via upgrade.
  await page.getByRole('button', { name: 'Upgrade' }).click();
  const modal = page.locator('div.fixed.inset-0');
  await modal.locator('select').nth(1).selectOption({ label: 'Pro' });
  await modal.locator('input[type="checkbox"]').check();
  await modal.getByRole('button', { name: 'Confirm' }).click();
  const invoiceId = await modal.locator('span.font-mono').first().innerText();
  await modal.getByRole('button', { name: 'Close' }).click();

  // Switch to ORG_A where this user is END_USER.
  await apiSetActiveOrg(page, ORG_A);
  await gotoApp(page, '/app/subscription');

  await expect(page.getByRole('button', { name: 'Upgrade' })).toBeDisabled();
  await expect(page.getByText('Your role is', { exact: false })).toBeVisible();

  // IDOR: invoice from ORG_B must not be accessible under ORG_A context.
  const res = await page.request.get(`${API_ORIGIN}/app/billing/invoices/${invoiceId}`, {
    headers: {
      origin: WEB_ORIGIN,
      'X-Organization-Id': ORG_A,
    },
  });

  expect(res.status()).toBe(404);
});
