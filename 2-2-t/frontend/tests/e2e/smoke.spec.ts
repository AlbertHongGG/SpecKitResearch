import { expect, test } from '@playwright/test';

test('smoke: backend health + frontend boots', async ({ page, request }) => {
  const healthRes = await request.get('http://localhost:4000/api/health');
  expect(healthRes.ok()).toBeTruthy();
  await expect(healthRes.json()).resolves.toEqual({ ok: true });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SmartBooking' })).toBeVisible();
});
