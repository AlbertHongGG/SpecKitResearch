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

test('US2 flow: apply seller → admin approve → create product → buyer checkout → seller ship', async ({ page }) => {
  const ts = Date.now();
  const email = `seller_applicant_${ts}@example.com`;
  const password = 'password123';
  const shopName = `My Shop ${ts}`;
  const productTitle = `E2E Product ${ts}`;

  // Signup new buyer
  await page.goto('/signup');
  await page.getByLabel('email').fill(email);
  await page.getByLabel('password').fill(password);
  await page.getByRole('button', { name: '註冊' }).click();
  await expect(page).toHaveURL(/\/login/);

  // Login and apply seller
  await login(page, email, password);
  await page.goto('/seller/apply');
  await expect(page.getByRole('heading', { name: '申請成為賣家' })).toBeVisible();
  await page.getByLabel('shopName').fill(shopName);
  await page.getByRole('button', { name: '送出申請' }).click();
  await expect(page.getByText('目前狀態')).toBeVisible();

  await logout(page);

  // Admin approves application
  await login(page, 'admin@example.com', 'password123');
  await page.goto('/admin/seller-applications');
  await expect(page.getByRole('heading', { name: '賣家申請審核' })).toBeVisible();
  const card = page.locator('div').filter({ hasText: shopName }).first();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: '核准' }).click();

  await logout(page);

  // Seller creates a product and sets it active
  await login(page, email, password);
  await page.goto('/seller/products');
  await expect(page.getByText('賣家後台')).toBeVisible();

  await page.getByRole('button', { name: '新增商品' }).click();
  await expect(page.getByRole('heading', { name: '新增商品' })).toBeVisible();

  await page.getByLabel('title').fill(productTitle);
  await page.getByLabel('description').fill('E2E product description');
  await page.getByLabel('price').fill('12300');
  await page.getByLabel('stock').fill('5');

  // Choose first category option (after placeholder)
  const categorySelect = page.getByLabel('categoryId');
  await categorySelect.selectOption({ index: 1 });

  await page.getByRole('button', { name: '建立' }).click();
  await expect(page).toHaveURL(/\/seller\/products\/.+\/edit/);

  await page.getByLabel('status').selectOption('active');
  await page.getByRole('button', { name: '更新' }).click();

  // Buyer sees it and purchases
  await logout(page);
  await login(page, 'buyer@example.com', 'password123');

  await page.goto('/');
  const productLink = page.getByRole('link', { name: productTitle }).first();
  await expect(productLink).toBeVisible();
  await productLink.click();

  await page.getByRole('button', { name: '加入購物車' }).click();
  await expect(page.getByText('已加入購物車')).toBeVisible();
  await page.getByRole('link', { name: '前往購物車' }).click();
  await page.getByRole('link', { name: '前往結帳' }).click();
  await page.getByRole('button', { name: '建立訂單' }).click();
  await page.getByRole('button', { name: '模擬付款成功' }).click();

  // Seller ships the paid suborder
  await logout(page);
  await login(page, email, password);
  await page.goto('/seller/orders');
  const first = page.locator('a[href^="/seller/orders/"]').first();
  await expect(first).toBeVisible();
  await first.click();

  await expect(page.getByText('子訂單詳情')).toBeVisible();
  await page.getByRole('button', { name: '標記出貨' }).click();
  await expect(page.getByText('shipped')).toBeVisible();
});
