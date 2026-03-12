import { test, expect } from '@playwright/test';

test('US1: register → projects → logout', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('顯示名稱').fill('E2E');
  await page.getByLabel('密碼').fill('password123');
  await page.getByRole('button', { name: '註冊' }).click();

  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('heading', { name: '專案', level: 1 })).toBeVisible();
  await expect(page.getByText('目前沒有專案。')).toBeVisible();

  await page.getByRole('button', { name: '登出' }).click();

  // After logout, visiting /projects should redirect to login.
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login\?next=%2Fprojects/);
});
