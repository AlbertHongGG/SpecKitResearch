import { expect, test } from '@playwright/test';

test('guest visiting /orgs redirects to /login with returnTo', async ({ page }) => {
  await page.goto('/orgs');

  await page.waitForURL('**/login**');

  const url = new URL(page.url());
  expect(url.pathname).toBe('/login');
  expect(url.searchParams.get('returnTo')).toBe('/orgs');

  await expect(page.getByRole('heading', { name: '登入' })).toBeVisible();
});
