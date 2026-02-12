import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('email').fill(email);
  await page.getByLabel('password').fill(password);
  await page.getByRole('button', { name: '登入' }).click();
}

async function logout(page: Page) {
  await page.getByRole('button', { name: '登出' }).click();
  await expect(page).toHaveURL(/\/login/);
}

test('US3 flow: buyer requests refund → seller rejects → admin forces refund', async ({ page }) => {
  // Buyer places an order for a seeded product
  await page.goto('/');
  await page.getByRole('link', { name: 'USB-C Cable' }).first().click();

  await page.getByRole('button', { name: '加入購物車' }).click();
  await expect(page).toHaveURL(/\/login/);

  await login(page, 'buyer@example.com', 'password123');
  await expect(page).toHaveURL(/\/products\//);

  await page.getByRole('button', { name: '加入購物車' }).click();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await page.getByRole('link', { name: '前往結帳' }).click();
  await page.getByRole('button', { name: '建立訂單' }).click();
  await page.getByRole('button', { name: '模擬付款成功' }).click();

  await page.getByRole('link', { name: '前往訂單詳情' }).click();
  await expect(page.getByRole('heading', { name: '訂單詳情' })).toBeVisible();

  // Enter suborder detail and request refund
  const firstSubOrder = page.locator('a[href*="/suborders/"]').first();
  await expect(firstSubOrder).toBeVisible();
  await firstSubOrder.click();

  await page.getByLabel('reason').fill('E2E refund request');
  await page.getByLabel('requestedAmount').fill('19900');
  await page.getByRole('button', { name: '送出退款申請' }).click();

  await logout(page);

  // Seller rejects refund and capture refundId
  await login(page, 'seller1@example.com', 'password123');
  await page.goto('/seller/refunds');

  const refundCard = page.locator('div').filter({ hasText: 'E2E refund request' }).first();
  await expect(refundCard).toBeVisible();

  const idLine = refundCard.getByText(/refundId: /);
  const idText = await idLine.textContent();
  const refundId = (idText ?? '').replace('refundId: ', '').trim();
  expect(refundId).toBeTruthy();

  await refundCard.getByRole('button', { name: '拒絕' }).click();
  await expect(refundCard.getByText('rejected')).toBeVisible();

  await logout(page);

  // Admin forces refund
  await login(page, 'admin@example.com', 'password123');
  await page.goto('/admin/refunds');
  await page.getByLabel('refundId').fill(refundId);
  await page.getByLabel('reason').fill('E2E admin force');
  await page.getByRole('button', { name: '強制退款' }).click();

  await logout(page);

  // Seller sees refunded
  await login(page, 'seller1@example.com', 'password123');
  await page.goto('/seller/refunds');
  const updated = page.locator('div').filter({ hasText: refundId }).first();
  await expect(updated.getByText('refunded')).toBeVisible();
});
