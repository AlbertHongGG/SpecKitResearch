import { test, expect } from '@playwright/test';
import { apiLogin, gotoApp } from './helpers';

test('admin override Expired is irreversible', async ({ page }) => {
  await apiLogin(page, { email: 'admin@example.com', password: 'admin1234' });
  await gotoApp(page, '/admin/overrides');

  const orgInput = page.getByPlaceholder('organizationId');
  await orgInput.fill('override-org');

  await page.locator('select').first().selectOption('Expired');
  await page.getByPlaceholder('reason').fill('e2e');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText(/Result:\s*Expired/)).toBeVisible();

  // Try to revoke → should be rejected.
  await page.locator('select').first().selectOption('NONE');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText('Expired override is irreversible')).toBeVisible();
});
