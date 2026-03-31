import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('Provider journey: create service/time slot → see booking → complete', async ({ browser }) => {
  // Provider creates a service and a time slot.
  const providerContext = await browser.newContext()
  const providerPage = await providerContext.newPage()

  await login(providerPage, { email: 'provider@example.com', password: 'provider1234' })
  await providerPage.getByRole('link', { name: 'Provider' }).click()
  await providerPage.getByRole('link', { name: 'Manage Services' }).click()

  await providerPage.getByLabel('Name').fill('E2E Service')
  await providerPage.getByLabel('Description').fill('Created by Playwright')
  await providerPage.getByLabel('Duration (minutes)').fill('30')
  await providerPage.getByRole('button', { name: 'Create' }).click()

  await expect(providerPage.getByRole('heading', { name: 'Edit Service' })).toBeVisible()
  await providerPage.getByRole('link', { name: 'Manage time slots' }).click()

  // Create a slot far in the future (local datetime input).
  await expect(providerPage.getByRole('heading', { name: 'Time Slots' })).toBeVisible()

  await providerPage.getByLabel('Start time').fill('2030-01-01T10:00')
  await providerPage.getByLabel('End time').fill('2030-01-01T10:30')
  await providerPage.getByLabel('Cancel deadline').fill('2029-12-31T23:59')
  await providerPage.getByLabel('Capacity').fill('1')
  await providerPage.getByRole('button', { name: 'Create' }).click()

  // Capture the time slot row so we can navigate to bookings.
  const slotRow = providerPage.locator('li', { hasText: '2030-01-01 10:00' }).first()
  await expect(slotRow).toBeVisible()

  const bookingsLink = slotRow.getByRole('link', { name: 'Bookings' })

  // User books that slot.
  const userContext = await browser.newContext()
  const userPage = await userContext.newPage()

  await login(userPage, { email: 'user@example.com', password: 'user1234' })
  await userPage.getByRole('link', { name: 'Services' }).click()

  // Find the newly created service and book.
  await userPage
    .locator('li', { hasText: 'E2E Service' })
    .first()
    .getByRole('link', { name: 'View' })
    .click()
  await userPage.getByRole('button', { name: 'Book' }).first().click()
  await expect(userPage.getByText('Booking created.')).toBeVisible()

  // Provider sees the booking and completes it.
  await bookingsLink.click()
  await expect(providerPage.getByRole('heading', { name: 'Time Slot Bookings' })).toBeVisible()

  await providerPage.getByRole('button', { name: 'Complete' }).first().click()
  await expect(providerPage.getByText('Status: COMPLETED')).toBeVisible()

  await providerContext.close()
  await userContext.close()
})
