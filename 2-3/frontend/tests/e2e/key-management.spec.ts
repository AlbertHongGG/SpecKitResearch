import { test, expect, type Page } from '@playwright/test';

function uniqueEmail() {
  const ts = Date.now();
  return `e2e_us2_${ts}@example.com`;
}

async function registerAndLogin(page: Page) {
  const email = uniqueEmail();
  const password = 'password123';

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
}

async function createApiKey(page: Page, input: { name: string; scopes: string; rateLimitPerMinute?: string }) {
  await page.getByRole('button', { name: '建立 API Key' }).click();

  await page.getByLabel('名稱').fill(input.name);
  await page.getByLabel('Scopes（逗號分隔）').fill(input.scopes);
  if (input.rateLimitPerMinute !== undefined) {
    await page.getByLabel('每分鐘上限（可選）').fill(input.rateLimitPerMinute);
  }

  await page.getByRole('button', { name: '建立', exact: true }).click();

  const plaintextTitle = page.getByText('API Key（只顯示一次）');
  const createError = page.getByText(/建立失敗/);
  await Promise.race([
    plaintextTitle.waitFor({ state: 'visible', timeout: 15_000 }),
    createError.waitFor({ state: 'visible', timeout: 15_000 })
  ]);

  if (await createError.isVisible()) {
    throw new Error(`Create API key failed: ${(await createError.innerText()).trim()}`);
  }

  const plaintext = (await page.locator('code', { hasText: /\bak_[A-Za-z0-9_-]+/ }).first().innerText()).trim();
  await expect(plaintext).toMatch(/^ak_/);

  await page.getByRole('button', { name: '關閉' }).first().click();
  return plaintext;
}

async function openKeyDetailFromList(page: Page, name: string) {
  await page.getByRole('link', { name }).click();
  await expect(page.getByRole('heading', { name: 'Key 詳情' })).toBeVisible();
  await expect(page).toHaveURL(/\/keys\/[0-9a-f-]{8}-[0-9a-f-]{4}-[1-5][0-9a-f-]{3}-[89ab][0-9a-f-]{3}-[0-9a-f-]{12}/i);
}

async function currentKeyId(page: Page): Promise<string> {
  const urlMatch = page
    .url()
    .match(/\/keys\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i);
  if (urlMatch?.[1]) return urlMatch[1];

  // Fallback: extract from page content.
  const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
  const idText = await page.getByText(uuidRe).first().innerText();
  const match = idText.match(uuidRe);
  if (!match) throw new Error('Could not find api_key_id on page');
  return match[0];
}

test('US2：更新 / 撤銷 / rotation / 查 logs', async ({ page }) => {
  test.setTimeout(90_000);
  const backendBaseUrl = process.env.PLAYWRIGHT_BACKEND_BASE_URL ?? 'http://localhost:3000';

  await registerAndLogin(page);

  const keyAName = 'Key A (demo:read)';
  const keyBName = 'Key B (no scope)';

  const keyAPlain = await createApiKey(page, {
    name: keyAName,
    scopes: 'demo:read',
    rateLimitPerMinute: '1'
  });

  const keyBPlain = await createApiKey(page, {
    name: keyBName,
    scopes: 'other:read',
    rateLimitPerMinute: '1'
  });

  // Update key A name
  await openKeyDetailFromList(page, keyAName);
  const keyAId = await currentKeyId(page);

  await page.getByLabel('名稱').fill('Key A updated');
  await page.getByRole('button', { name: '更新' }).click();
  await expect(page.getByText('已更新')).toBeVisible();

  // Rotate key A and capture new plaintext
  await page.getByRole('button', { name: '輪替（Rotate）' }).click();
  await page.getByRole('button', { name: '建立新 Key' }).click();
  const rotatedPlain = (await page.locator('code', { hasText: 'ak_' }).first().innerText()).trim();
  await expect(rotatedPlain).toMatch(/^ak_/);
  await page.getByRole('button', { name: '前往新 Key' }).click();
  // Wait for navigation away from the old key detail URL.
  await expect
    .poll(() => page.url(), { timeout: 15_000 })
    .not.toContain(`/keys/${keyAId}`);
  await expect(page).toHaveURL(/\/keys\/[0-9a-f-]{8}-[0-9a-f-]{4}-[1-5][0-9a-f-]{3}-[89ab][0-9a-f-]{3}-[0-9a-f-]{12}/i);
  await expect(page.getByText('狀態：active')).toBeVisible();
  const keyA2Id = await currentKeyId(page);

  // Generate usage logs
  // 401: old key A after rotation
  const r401 = await page.request.get(`${backendBaseUrl}/gateway/demo/demo/ping`, {
    headers: { Authorization: `Bearer ${keyAPlain}` }
  });
  expect(r401.status()).toBe(401);

  // 403: key B missing scope
  const r403 = await page.request.get(`${backendBaseUrl}/gateway/demo/demo/ping`, {
    headers: { Authorization: `Bearer ${keyBPlain}` }
  });
  expect(r403.status()).toBe(403);

  // 429: key A2 rate limited (1/min)
  const r200 = await page.request.get(`${backendBaseUrl}/gateway/demo/demo/ping`, {
    headers: { Authorization: `Bearer ${rotatedPlain}` }
  });
  expect(r200.status()).toBe(200);
  const r429 = await page.request.get(`${backendBaseUrl}/gateway/demo/demo/ping`, {
    headers: { Authorization: `Bearer ${rotatedPlain}` }
  });
  expect(r429.status()).toBe(429);

  // Revoke key B
  await page.goto('/keys');
  await openKeyDetailFromList(page, keyBName);
  const keyBId = await currentKeyId(page);
  await page.getByRole('button', { name: '撤銷此 Key' }).click();
  await page.getByRole('button', { name: '確認撤銷' }).click();
  await expect(page.getByText('狀態：revoked')).toBeVisible();

  // Logs UI assertions
  // Old key A: should show 401
  await page.goto(`/keys/${keyAId}`);
  await page.getByRole('button', { name: '用量' }).click();
  await page.getByPlaceholder('例如 401').fill('401');
  await page.getByPlaceholder('例如 "GET /gateway/demo/hello" 或 endpoint_id').fill('GET /gateway/demo/demo/ping');
  await expect(page.locator('table')).toContainText('401');

  // Key B: should show 403
  await page.goto(`/keys/${keyBId}`);
  await page.getByRole('button', { name: '用量' }).click();
  await page.getByPlaceholder('例如 401').fill('403');
  await page.getByPlaceholder('例如 "GET /gateway/demo/hello" 或 endpoint_id').fill('GET /gateway/demo/demo/ping');
  await expect(page.locator('table')).toContainText('403');

  // New key A2: should show 429
  await page.goto(`/keys/${keyA2Id}`);
  await page.getByRole('button', { name: '用量' }).click();
  await page.getByPlaceholder('例如 401').fill('429');
  await page.getByPlaceholder('例如 "GET /gateway/demo/hello" 或 endpoint_id').fill('GET /gateway/demo/demo/ping');
  await expect(page.locator('table')).toContainText('429');
});
