import { test, expect } from '@playwright/test';

test('US1: User 建立 Draft → 編輯 → 上傳附件 → 送審', async ({ page }) => {
  await page.goto('/login');

  await page.getByTestId('login-email').fill('user@example.com');
  await page.getByTestId('login-password').fill('password');
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.status() === 200),
    page.getByTestId('login-submit').click(),
  ]);

  await expect(page).toHaveURL(/\/documents/);

  await page.getByRole('button', { name: '新增 Draft' }).click();

  await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}$/i);

  await page.getByTestId('draft-title').fill('E2E 文件');
  await page.getByTestId('draft-content').fill('Hello from E2E');
  await page.getByTestId('save-draft').click();

  await page.getByTestId('attachment-file').setInputFiles({
    name: 'a.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello'),
  });
  await page.getByTestId('upload-attachment').click();

  await expect(page.getByText('a.txt')).toBeVisible();

  await page.getByTestId('submit-for-approval').click();

  // 送審後應顯示非 Draft 狀態，並且變成只讀（儲存 Draft 按鈕消失）
  await expect(page.getByText('InReview')).toBeVisible();
  await expect(page.getByTestId('save-draft')).toHaveCount(0);
  await expect(page.getByText('Hello from E2E')).toBeVisible();
});
