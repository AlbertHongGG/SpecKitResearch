import { test, expect } from '@playwright/test';

function uniqueEmail() {
  const ts = Date.now();
  return `e2e_${ts}@example.com`;
}

test('Guest → 註冊 → 登入 → /keys（含 next redirect）', async ({ page }) => {
  const email = uniqueEmail();
  const password = 'password123';

  await page.goto('/keys');
  await expect(page).toHaveURL(/\/login\?next=%2Fkeys/);

  await page.goto('/register?next=%2Fkeys');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: '建立帳號' }).click();

  await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Fkeys&email=${encodeURIComponent(email)}`));

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: '登入' }).click();

  await expect(page).toHaveURL('/keys');
  await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();
});
