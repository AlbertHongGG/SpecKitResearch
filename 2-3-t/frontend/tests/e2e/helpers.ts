import { expect, type Page } from '@playwright/test';

export function uniqueEmail(prefix: string) {
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${prefix}.${id}@example.com`;
}

export async function registerViaUi(page: Page, opts: { email: string; password: string }) {
  await page.goto('/register');
  await page.locator('input[type="email"]').fill(opts.email);
  await page.locator('input[type="password"]').fill(opts.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
}

export async function loginViaUi(page: Page, opts: { email: string; password: string }) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(opts.email);
  await page.locator('input[type="password"]').fill(opts.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/keys/);
}

export async function createKeyViaUi(page: Page, opts: { name: string; scopeKey?: string }) {
  await page.goto('/keys');
  await page.getByText('Create key').waitFor();

  let lastCreateKeyPayload: any = null;
  const onRequest = (req: any) => {
    try {
      if (req.method() !== 'POST') return;
      const url = new URL(req.url());
      if (url.pathname !== '/keys') return;
      lastCreateKeyPayload = req.postDataJSON?.() ?? null;
    } catch {
      // ignore
    }
  };
  page.on('request', onRequest);

  const form = page.getByRole('heading', { name: 'Create key' }).locator('..');
  await form.locator('input').first().fill(opts.name);

  if (opts.scopeKey) {
    const scopeCheckbox = page.locator('label', { hasText: opts.scopeKey }).locator('input[type="checkbox"]');
    await expect(scopeCheckbox).toBeVisible();
    await scopeCheckbox.check();
    await expect(scopeCheckbox).toBeChecked();
  }

  const [createRes] = await Promise.all([
    page.waitForResponse((res) => {
      try {
        return res.request().method() === 'POST' && new URL(res.url()).pathname === '/keys';
      } catch {
        return false;
      }
    }),
    page.getByRole('button', { name: 'Create' }).click(),
  ]);
  await expect(page.getByText('你的 API Key（只顯示一次）')).toBeVisible();

  if (opts.scopeKey) {
    const scopes = (lastCreateKeyPayload?.scopes ?? lastCreateKeyPayload?.scopeKeys ?? []) as unknown;
    expect(Array.isArray(scopes)).toBe(true);
    expect(scopes).toContain(opts.scopeKey);

    const createJson: any = await createRes.json();
    const returnedScopes = createJson?.api_key?.scopes ?? [];
    expect(Array.isArray(returnedScopes)).toBe(true);
    expect(returnedScopes).toContain(opts.scopeKey);
  }

  const plainKey = (await page.locator('pre').first().innerText()).trim();
  expect(plainKey).toMatch(/^sk_[^_]+_.+/);

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('你的 API Key（只顯示一次）')).toBeHidden();

  page.off('request', onRequest);

  return { plainKey };
}

export async function findKeyIdFromToken(token: string) {
  const m = /^sk_([^_]+)_.+$/.exec(token);
  if (!m) throw new Error('Invalid key token format');
  return m[1];
}
