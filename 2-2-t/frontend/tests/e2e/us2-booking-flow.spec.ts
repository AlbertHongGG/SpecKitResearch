import { test, expect } from '@playwright/test';

const seededUser = {
  email: 'user@example.com',
  password: 'Password123!',
};

test('US2: user can create booking, view my-bookings, and cancel', async ({ page }) => {
  // Login
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

  await page.getByLabel('Email').fill(seededUser.email);
  await page.getByLabel('Password').fill(seededUser.password);
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole('link', { name: 'My Bookings' })).toBeVisible();

  // Navigate to seeded service
  await page.getByRole('link', { name: '示範服務' }).click();
  await expect(page.getByRole('heading', { name: 'Open time slots' })).toBeVisible();

  // Create booking (first timeslot)
  const bookBtn = page.getByRole('button', { name: '立即預約' }).first();
  await expect(bookBtn).toBeVisible();
  await bookBtn.click();

  await expect(page.getByText('已預約')).toBeVisible();

  // View my bookings
  await page.getByRole('link', { name: 'My Bookings' }).click();
  await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible();

  const firstItem = page.locator('li').first();
  await expect(firstItem.getByText('Status:')).toBeVisible();

  // Cancel
  const cancelBtn = page.getByRole('button', { name: '取消預約' }).first();
  await expect(cancelBtn).toBeVisible();
  await cancelBtn.click();

  await expect(page.getByText('Status: CANCELLED')).toBeVisible();
});
