import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('User journey: login → browse → book → cancel', async ({ page }) => {
  await login(page, { email: 'user@example.com', password: 'user1234' })

  // Browse and open a service.
  await page.getByRole('link', { name: 'Services' }).click()
  await expect(page.getByRole('heading', { name: 'Services' })).toBeVisible()

  // Open the seeded service.
  const seededServiceRow = page.locator('li', { hasText: '示範服務' }).first()
  await expect(seededServiceRow).toBeVisible()
  await seededServiceRow.getByRole('link', { name: 'View' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // Book the first available slot.
  await page.getByRole('button', { name: 'Book' }).first().click()
  await expect(page.getByText('Booking created.')).toBeVisible()

  // Cancel from My Bookings.
  await page.getByRole('link', { name: 'My Bookings' }).click()
  await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible()

  await page.getByRole('button', { name: 'Cancel' }).first().click()

  // Booking should remain visible with a non-actionable status.
  await expect(page.getByText('Status: CANCELLED')).toBeVisible()
})
