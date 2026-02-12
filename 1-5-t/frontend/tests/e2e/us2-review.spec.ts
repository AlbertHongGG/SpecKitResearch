import { test, expect } from '@playwright/test';

test('US2: Reviewer 待辦 → 詳情 → approve/reject（reason 必填 + 409）', async ({ page }) => {
  // 先用 User 建立一份送審文件
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

  const docUrl = page.url();
  const docIdMatch = /\/documents\/([0-9a-f-]{36})/i.exec(docUrl);
  if (!docIdMatch) throw new Error(`Unexpected docUrl: ${docUrl}`);
  const docId = docIdMatch[1]!;

  await page.getByTestId('draft-title').fill('E2E US2 文件');
  await page.getByTestId('draft-content').fill('for review');
  await page.getByTestId('save-draft').click();
  await page.getByTestId('submit-for-approval').click();
  await expect(page.getByText('InReview')).toBeVisible();

  // 登出後用 Reviewer1 處理待辦
  await page.getByRole('button', { name: '登出' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByTestId('login-email').fill('reviewer1@example.com');
  await page.getByTestId('login-password').fill('password');
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.status() === 200),
    page.getByTestId('login-submit').click(),
  ]);

  const reviewerCookies = await page.context().cookies();
  expect(reviewerCookies.some((c) => c.name === 'session')).toBe(true);

  // 等待登入完成後的導頁，避免中途 page.goto 取消 navigation 導致 session 沒建立。
  await page.goto('/documents');
  await expect(page).toHaveURL(/\/documents/);
  await page.goto('/reviews');
  await expect(page).toHaveURL(/\/reviews/);

  // 進入該文件
  await expect(page.locator(`a[href="/documents/${docId}"]`).first()).toBeVisible();
  await page.locator(`a[href="/documents/${docId}"]`).first().click();
  await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}$/i);

  // 開第二個分頁，製造同任務重複提交 -> 409
  const page2 = await page.context().newPage();
  await page2.goto(docUrl);

  await expect(page.getByText('我的審核動作')).toBeVisible();
  await expect(page2.getByText('我的審核動作')).toBeVisible();

  // reason 必填
  await page2.getByTestId('reject-task').click();
  await expect(page2.getByTestId('review-action-error')).toContainText('退回理由必填');

  // 第一個分頁先同意
  await page.getByTestId('approve-task').click();

  // 第二個分頁再同意（同一個任務）應得到 409
  await page2.getByTestId('approve-task').click();
  await expect(page2.getByTestId('review-action-error')).toContainText('409');
});
