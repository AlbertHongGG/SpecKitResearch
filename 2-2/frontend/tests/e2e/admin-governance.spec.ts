import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('Admin journey: deactivate service + suspend user → restrictions enforced', async ({
  browser,
}) => {
  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()

  await login(adminPage, { email: 'admin@example.com', password: 'admin1234' })
  await adminPage.getByRole('link', { name: 'Admin' }).click()
  await adminPage.getByRole('link', { name: 'Manage Users' }).click()

  // Ensure user@example.com is ACTIVE before logging in as that user.
  const userRow = adminPage.getByText('user@example.com').first().locator('..').locator('..')
  await expect(userRow).toBeVisible()

  const statusText = userRow.getByText(/Status:/)
  const toggleButton = userRow.getByRole('button')

  const statusContent = await statusText.textContent()
  if (statusContent?.includes('SUSPENDED')) {
    await toggleButton.click()
  }

  await expect(userRow.getByText('Status: ACTIVE')).toBeVisible()

  // Ensure the seeded service is ACTIVE.
  await adminPage.getByRole('link', { name: 'Manage Services' }).click()
  const serviceRow = adminPage.locator('li', { hasText: '示範服務' }).first()
  await expect(serviceRow).toBeVisible()
  const serviceStatusText = serviceRow.getByText(/Status:/)
  const serviceToggleButton = serviceRow.getByRole('button')
  const serviceStatus = await serviceStatusText.textContent()
  if (serviceStatus?.includes('INACTIVE')) {
    await serviceToggleButton.click()
  }
  await expect(serviceRow.getByText('Status: ACTIVE')).toBeVisible()

  // User logs in while ACTIVE.
  const userContext = await browser.newContext()
  const userPage = await userContext.newPage()
  await login(userPage, { email: 'user@example.com', password: 'user1234' })

  // Deactivate the seeded service; user should not be able to book it.
  await serviceToggleButton.click()
  await expect(serviceRow.getByText('Status: INACTIVE')).toBeVisible()

  await userPage.getByRole('link', { name: 'Services' }).click()
  const seededServiceCard = userPage.locator('li', { hasText: '示範服務' }).first()
  await seededServiceCard.getByRole('link', { name: 'View' }).click()
  await userPage.getByRole('button', { name: 'Book' }).first().click()
  await expect(userPage.getByText(/requestId:/)).toBeVisible()

  // Reactivate service so subsequent runs start clean.
  await serviceToggleButton.click()
  await expect(serviceRow.getByText('Status: ACTIVE')).toBeVisible()

  // Suspend the already-logged-in user; protected requests should become 401.
  await adminPage.getByRole('link', { name: 'Manage Users' }).click()
  const refreshedUserRow = adminPage
    .getByText('user@example.com')
    .first()
    .locator('..')
    .locator('..')
  await expect(refreshedUserRow).toBeVisible()
  await refreshedUserRow.getByRole('button').click()
  await expect(refreshedUserRow.getByText('Status: SUSPENDED')).toBeVisible()

  await userPage.getByRole('link', { name: 'My Bookings' }).click()

  // Protected request should fail and show an error banner.
  await expect(userPage.getByText(/requestId:/)).toBeVisible()

  // Restore user to ACTIVE for repeatability.
  await refreshedUserRow.getByRole('button').click()
  await expect(refreshedUserRow.getByText('Status: ACTIVE')).toBeVisible()

  await adminContext.close()
  await userContext.close()
})
