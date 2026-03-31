import { test, expect, type Page } from '@playwright/test';

const seededProvider = {
  email: 'provider@example.com',
  password: 'Password123!',
};

const seededUser = {
  email: 'user@example.com',
  password: 'Password123!',
};

function datetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Submit' }).click();
}

test('US3: provider can manage services/timeslots and update booking status', async ({ page }) => {
  const serviceName = `E2E Provider Service ${Date.now()}`;

  // Provider creates a service and a time slot
  await login(page, seededProvider.email, seededProvider.password);
  await expect(page).toHaveURL(/\/provider\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Provider dashboard' })).toBeVisible();

  await page.locator('#provider-service-name').fill(serviceName);
  await page.locator('#provider-service-desc').fill('E2E created service');
  await page.locator('#provider-service-duration').fill('30');
  await page.locator('#provider-service-status').selectOption('ACTIVE');
  const serviceCreateForm = page.locator('form').filter({ has: page.locator('#provider-service-name') });
  await serviceCreateForm.getByRole('button', { name: 'Create' }).click();

  // Ensure it appears in the services list
  const myServicesPanel = page.getByRole('heading', { name: 'My services' }).locator('..');
  await expect(myServicesPanel.getByText(serviceName, { exact: true })).toBeVisible();

  // Select newly created service in timeslot panel
  await page.locator('#provider-timeslot-service').selectOption({ label: `${serviceName} (ACTIVE)` });

  const now = new Date();
  const start = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const deadline = new Date(start.getTime() - 10 * 60 * 1000);

  await page.locator('#timeslot-start').fill(datetimeLocal(start));
  await page.locator('#timeslot-end').fill(datetimeLocal(end));
  await page.locator('#timeslot-deadline').fill(datetimeLocal(deadline));
  await page.locator('#timeslot-capacity').fill('2');
  await page.locator('#timeslot-status').selectOption('OPEN');
  const timeSlotCreateForm = page.locator('form').filter({ has: page.locator('#timeslot-start') });
  await timeSlotCreateForm.getByRole('button', { name: 'Create' }).click();

  // User books the new service/time slot
  await page.getByRole('button', { name: 'Logout' }).click();
  await login(page, seededUser.email, seededUser.password);
  await expect(page).toHaveURL(/\/services$/);

  await page.getByRole('link', { name: serviceName }).click();
  await expect(page.getByRole('heading', { name: 'Open time slots' })).toBeVisible();

  const bookBtn = page.getByRole('button', { name: '立即預約' }).first();
  await bookBtn.click();
  await expect(page.getByText('已預約')).toBeVisible();

  // Provider updates booking status through dashboard
  await page.getByRole('button', { name: 'Logout' }).click();
  await login(page, seededProvider.email, seededProvider.password);
  await expect(page).toHaveURL(/\/provider\/dashboard$/);

  const bookingsSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Bookings' }) });

  const bookingItem = bookingsSection.locator('li').filter({ hasText: serviceName }).first();
  await expect(bookingItem).toBeVisible();

  const combobox = bookingItem.getByRole('combobox', { name: /Update status for booking/ });
  await combobox.selectOption('CONFIRMED');
  await expect(bookingItem.getByText('Status: CONFIRMED')).toBeVisible();

  await combobox.selectOption('COMPLETED');
  await expect(bookingItem.getByText('Status: COMPLETED')).toBeVisible();
});
