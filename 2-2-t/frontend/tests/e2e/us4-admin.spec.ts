import { test, expect, type Page } from '@playwright/test';

const seededAdmin = {
  email: 'admin@example.com',
  password: 'Password123!',
};

const seededProvider = {
  email: 'provider@example.com',
  password: 'Password123!',
};

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Submit' }).click();
}

test('US4: admin can manage accounts/services and view report summary', async ({ page }) => {
  const newUserEmail = `e2e-user-${Date.now()}@example.com`;
  const newServiceName = `E2E Admin Service ${Date.now()}`;

  // Create a fresh user to suspend (avoid mutating seeded users used by other E2E tests)
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible();
  await page.getByLabel('Email').fill(newUserEmail);
  await page.getByLabel('Password').fill('Password123!');
  await page.getByLabel('Role').selectOption('USER');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page).toHaveURL(/\/services$/);

  await page.getByRole('button', { name: 'Logout' }).click();

  // Create a fresh service to inactivate
  await login(page, seededProvider.email, seededProvider.password);
  await expect(page).toHaveURL(/\/provider\/dashboard$/);

  await page.locator('#provider-service-name').fill(newServiceName);
  await page.locator('#provider-service-desc').fill('E2E created service (admin inactivates)');
  await page.locator('#provider-service-duration').fill('30');
  await page.locator('#provider-service-status').selectOption('ACTIVE');
  const serviceCreateForm = page.locator('form').filter({ has: page.locator('#provider-service-name') });
  await serviceCreateForm.getByRole('button', { name: 'Create' }).click();

  const myServicesPanel = page.getByRole('heading', { name: 'My services' }).locator('..');
  await expect(myServicesPanel.getByText(newServiceName, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();

  // Admin tab switching + operations
  await login(page, seededAdmin.email, seededAdmin.password);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();

  // Accounts tab: suspend the newly created user
  await page.getByRole('button', { name: 'Accounts' }).click();
  const userItem = page.locator('li').filter({ hasText: newUserEmail }).first();
  await expect(userItem).toBeVisible();
  await expect(userItem.getByText('Status: ACTIVE')).toBeVisible();
  await userItem.getByRole('button', { name: 'Suspend' }).click();
  await expect(userItem.getByText('Status: SUSPENDED')).toBeVisible();

  // Services tab: inactivate the newly created service
  await page.getByRole('button', { name: 'Services' }).click();
  const serviceItem = page.locator('li').filter({ hasText: newServiceName }).first();
  await expect(serviceItem).toBeVisible();
  await expect(serviceItem.getByText('Status: ACTIVE')).toBeVisible();
  await serviceItem.getByRole('button', { name: 'Inactivate' }).click();
  await expect(serviceItem.getByText('Status: INACTIVE')).toBeVisible();

  // Reports tab: summary is visible
  await page.getByRole('button', { name: 'Reports' }).click();
  await expect(page.getByText('Total bookings:')).toBeVisible();
  await expect(page.getByText('Active services:')).toBeVisible();
});
