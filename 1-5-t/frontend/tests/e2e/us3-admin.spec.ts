import { test, expect } from '@playwright/test';

test('US3: Admin 建模板→User 送審→Reviewer approve→Admin 封存', async ({ page }) => {
  const templateName = `E2E US3 模板 ${Date.now()}`;

  async function loginAs(email: string) {
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill('password');
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.status() === 200),
      page.getByTestId('login-submit').click(),
    ]);

    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === 'session')).toBe(true);
  }

  // Admin 建立一個只有 1 個 reviewer 的 Serial 模板（方便快速完成）
  await page.goto('/login');
  await loginAs('admin@example.com');

  await page.goto('/admin/flows');
  await expect(page.getByRole('heading', { name: '流程模板' })).toBeVisible();

  await page.getByRole('button', { name: '新增模板' }).click();
  await expect(page.getByText('模板編輯')).toBeVisible();

  await page.getByLabel('名稱').fill(templateName);

  // Step 1: mode=Serial, assignee=reviewer1
  const step1 = page.locator('div', { hasText: 'Step 1' }).first();
  await step1.getByLabel('mode').selectOption('Serial');
  await step1.getByRole('radio', { name: 'reviewer1@example.com' }).check();

  await page.getByRole('button', { name: '建立' }).click();

  await expect(page.getByText(templateName).first()).toBeVisible();

  // User 建立並送審文件
  await page.getByRole('button', { name: '登出' }).click();
  await expect(page).toHaveURL(/\/login/);

  await loginAs('user@example.com');
  await page.goto('/documents');
  await expect(page).toHaveURL(/\/documents/);

  await page.getByRole('button', { name: '新增 Draft' }).click();
  await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}$/i);
  const docUrl = page.url();
  const docIdMatch = /\/documents\/([0-9a-f-]{36})/i.exec(docUrl);
  if (!docIdMatch) throw new Error(`Unexpected docUrl: ${docUrl}`);
  const docId = docIdMatch[1]!;

  await page.getByTestId('draft-title').fill('E2E US3 文件');
  await page.getByTestId('draft-content').fill('for archive');
  await page.getByTestId('save-draft').click();

  await page.getByTestId('template-select').selectOption({ label: templateName });
  await page.getByTestId('submit-for-approval').click();
  await expect(page.getByText('InReview')).toBeVisible();

  // Reviewer approve
  await page.getByRole('button', { name: '登出' }).click();
  await expect(page).toHaveURL(/\/login/);

  await loginAs('reviewer1@example.com');
  await page.goto('/reviews');
  await expect(page.locator(`a[href="/documents/${docId}"]`).first()).toBeVisible();
  await page.locator(`a[href="/documents/${docId}"]`).first().click();
  await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}$/i);

  await page.getByTestId('approve-task').click();

  // Admin 封存
  await page.getByRole('button', { name: '登出' }).click();
  await expect(page).toHaveURL(/\/login/);

  await loginAs('admin@example.com');

  await page.goto(docUrl);
  await expect(page.getByRole('button', { name: '封存' })).toBeVisible();

  await page.getByRole('button', { name: '封存' }).click();
  await expect(page.getByText('Archived')).toBeVisible();
  await expect(page.getByText('此文件已封存，內容與附件皆為唯讀。')).toBeVisible();
});
