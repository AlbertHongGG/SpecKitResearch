import { test, expect, type Page } from '@playwright/test';

async function loginAsBuyer(page: Page) {
  await page.getByLabel('email').fill('buyer@example.com');
  await page.getByLabel('password').fill('password123');
  await page.getByRole('button', { name: '登入' }).click();
}

test('US1 checkout flow: login → add to cart → checkout → payment result → order detail', async ({ page }) => {
  await page.goto('/');

  // Pick the first product card
  const firstProduct = page.locator('a[href^="/products/"]').first();
  await expect(firstProduct).toBeVisible();
  await firstProduct.click();

  // Add to cart; if unauthenticated, expect redirect to login
  await page.getByRole('button', { name: '加入購物車' }).click();
  await expect(page).toHaveURL(/\/login/);

  await loginAsBuyer(page);

  // Back to product page (next param redirect) then add to cart
  await expect(page).toHaveURL(/\/products\//);
  await page.getByRole('button', { name: '加入購物車' }).click();
  await expect(page.getByText('已加入購物車')).toBeVisible();

  await page.getByRole('link', { name: '前往購物車' }).click();
  await expect(page).toHaveURL(/\/cart/);

  await page.getByRole('link', { name: '前往結帳' }).click();
  await expect(page).toHaveURL(/\/checkout/);

  await page.getByRole('button', { name: '建立訂單' }).click();
  await expect(page.getByText('已建立訂單：')).toBeVisible();

  await page.getByRole('button', { name: '模擬付款成功' }).click();
  await expect(page.getByText('已觸發付款 callback')).toBeVisible();

  await page.getByRole('link', { name: '前往付款結果' }).click();
  await expect(page).toHaveURL(/\/payment\/result\?orderId=/);

  await expect(page.getByText('付款狀態：succeeded')).toBeVisible();

  await page.getByRole('link', { name: '前往訂單詳情' }).click();
  await expect(page).toHaveURL(/\/orders\//);
  await expect(page.getByRole('heading', { name: '訂單詳情' })).toBeVisible();
});
