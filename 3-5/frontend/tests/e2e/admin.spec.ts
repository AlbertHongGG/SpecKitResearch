import { test, expect, type Page } from '@playwright/test';

function uniqueEmail() {
  const ts = Date.now();
  return `e2e_admin_${ts}@example.com`;
}

async function backendPost(page: Page, backendBaseUrl: string, path: string, data: any) {
  const res = await page.request.post(`${backendBaseUrl}${path}`, { data });
  const json = await res.json().catch(() => undefined);
  return { res, json };
}

async function backendGet(page: Page, backendBaseUrl: string, path: string) {
  const res = await page.request.get(`${backendBaseUrl}${path}`);
  const json = await res.json().catch(() => undefined);
  return { res, json };
}

test('US3：/admin 主要流程（catalog / enforcement / audit）', async ({ page }) => {
  test.setTimeout(120_000);

  const backendBaseUrl = process.env.PLAYWRIGHT_BACKEND_BASE_URL ?? 'http://localhost:3101';

  // 1) Create a developer + API key via backend API
  const devEmail = uniqueEmail();
  const devPassword = 'password123';
  const keyName = `E2E Key ${Date.now()}`;

  {
    const { res } = await backendPost(page, backendBaseUrl, '/register', { email: devEmail, password: devPassword });
    expect(res.status()).toBe(201);

    const login = await backendPost(page, backendBaseUrl, '/login', { email: devEmail, password: devPassword });
    expect(login.res.status()).toBe(200);

    const created = await backendPost(page, backendBaseUrl, '/api-keys', {
      name: keyName,
      scopes: ['demo:read'],
      rate_limit_per_minute: 60,
      rate_limit_per_hour: 1000,
    });
    expect(created.res.status()).toBe(201);
    expect(created.json?.api_key_plaintext).toMatch(/^ak_/);

    // Warmup: with existing seeded rule, this should be 200.
    const pingOk = await backendGet(page, backendBaseUrl, '/gateway/demo/demo/ping');
    // No auth header yet -> should be 401.
    expect(pingOk.res.status()).toBe(401);
  }

  // Grab dev key id/plaintext via list (avoid coupling to response shape too much)
  const devKeysList = await backendGet(page, backendBaseUrl, '/api-keys');
  expect(devKeysList.res.status()).toBe(200);
  const createdKeyRow = (devKeysList.json as any[])?.find((k) => k.name === keyName);
  expect(createdKeyRow?.api_key_id).toBeTruthy();

  // Re-login dev to get plaintext again is impossible; instead, create one more key and keep plaintext.
  const devKeyCreate2 = await backendPost(page, backendBaseUrl, '/api-keys', {
    name: `${keyName} (plain)`,
    scopes: ['demo:read'],
  });
  expect(devKeyCreate2.res.status()).toBe(201);
  const devKeyPlaintext: string = devKeyCreate2.json.api_key_plaintext;
  const devKeyId: string = devKeyCreate2.json.api_key_id;

  // 2) Switch session to admin (seeded user)
  {
    const adminEmail = 'admin@example.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'password123';
    const login = await backendPost(page, backendBaseUrl, '/login', { email: adminEmail, password: adminPassword });
    expect(login.res.status()).toBe(200);
  }

  // 3) Scope rule enforcement: delete rule -> 403, add back -> 200
  await page.goto('/admin/scope-rules');
  await expect(page.getByRole('heading', { name: 'Scope Rules' })).toBeVisible();

  // Delete seeded rule for demo:read -> demo GET /demo/ping
  await expect(page.locator('table')).toContainText('demo GET /demo/ping');
  const ruleRow = page.locator('tr', { hasText: 'demo GET /demo/ping' });
  await ruleRow.first().getByRole('button', { name: '刪除' }).click();
  await expect(ruleRow).toHaveCount(0);

  const r403 = await page.request.get(`${backendBaseUrl}/gateway/demo/demo/ping`, {
    headers: { Authorization: `Bearer ${devKeyPlaintext}` },
  });
  expect(r403.status()).toBe(403);

  // Add rule back using UI selectors
  await page.getByLabel('Scope').selectOption({ label: 'demo:read' });
  await page.getByLabel('Endpoint').selectOption({ label: 'demo GET /demo/ping' });
  await page.getByRole('button', { name: '建立' }).click();

  await expect(page.locator('table')).toContainText('demo GET /demo/ping');

  const r200 = await page.request.get(`${backendBaseUrl}/gateway/demo/demo/ping`, {
    headers: { Authorization: `Bearer ${devKeyPlaintext}` },
  });
  expect(r200.status()).toBe(200);

  // 4) Key enforcement: block the developer key in /admin/keys
  page.on('dialog', (d) => d.accept());
  await page.goto('/admin/keys');
  await expect(page.getByRole('heading', { name: 'Keys' })).toBeVisible();
  await page.getByLabel('Search').fill(keyName);

  // Wait for results table to include the key row.
  await expect(page.locator('table')).toContainText(`${keyName} (plain)`);

  const keyRow = page.locator('tr', { hasText: `${keyName} (plain)` });
  await keyRow.first().getByRole('button', { name: '封鎖' }).click();
  await expect(keyRow.first()).toContainText('blocked');

  // After block, request should be 401.
  const r401 = await page.request.get(`${backendBaseUrl}/gateway/demo/demo/ping`, {
    headers: { Authorization: `Bearer ${devKeyPlaintext}` },
  });
  expect(r401.status()).toBe(401);

  // 5) User enforcement: disable developer user
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  await page.getByLabel('Search (email contains)').fill(devEmail);

  await expect(page.locator('table')).toContainText(devEmail);
  const userRow = page.locator('tr', { hasText: devEmail });
  await userRow.getByRole('button', { name: '停用' }).click();

  await expect(userRow).toContainText('disabled');

  // 6) Smoke: audit + usage pages render
  await page.goto('/admin/usage');
  await expect(page.getByRole('heading', { name: 'Usage Logs' })).toBeVisible();

  await page.goto('/admin/audit');
  await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();
});
