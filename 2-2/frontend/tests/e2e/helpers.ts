import { expect, type Page } from '@playwright/test'

export async function login(page: Page, input: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(input.email)
  await page.getByLabel('Password').fill(input.password)
  await page.getByRole('button', { name: 'Login' }).click()

  // Post-login landing page is /services.
  await expect(page.getByRole('heading', { name: 'Services' })).toBeVisible()
}
