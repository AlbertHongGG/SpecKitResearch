import { expect, test } from '@playwright/test';

import { ensureGuest, loginAsUser } from './helpers/auth';

test.describe('nav visibility', () => {
  test('guest sees auth CTAs; user sees app nav + logout', async ({ page }) => {
    await ensureGuest(page);

    await page.goto('/login');

    await expect(page.getByRole('link', { name: '帳務' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: '類別' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: '月報表' })).toHaveCount(0);

    await expect(page.getByRole('navigation').getByRole('link', { name: '註冊' })).toBeVisible();

    await loginAsUser(page);

    await page.goto('/transactions');

    await expect(page.getByRole('link', { name: '帳務' })).toBeVisible();
    await expect(page.getByRole('link', { name: '類別' })).toBeVisible();
    await expect(page.getByRole('link', { name: '月報表' })).toBeVisible();
    await expect(page.getByRole('button', { name: '登出' })).toBeVisible();

    await expect(page.getByRole('link', { name: '登入' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: '註冊' })).toHaveCount(0);
  });
});
