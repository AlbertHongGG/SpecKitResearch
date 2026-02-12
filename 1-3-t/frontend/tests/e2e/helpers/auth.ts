import { expect, type Page } from '@playwright/test';

const appBaseUrl = process.env.PLAYWRIGHT_APP_BASE_URL ?? 'http://localhost:5173';
const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? 'http://localhost:3000';

function firstCookieValue(setCookie: string | string[] | undefined, name: string) {
  if (!setCookie) return undefined;
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const item of list) {
    const [pair] = item.split(';');
    const [k, v] = pair.split('=');
    if (k === name) return v;
  }
  return undefined;
}

function makeCsrfToken() {
  return `csrf_test_${Date.now()}_${Math.random().toString(16).slice(2)}_token`;
}

export async function ensureGuest(page: Page) {
  await page.context().clearCookies();
}

export async function loginAsUser(page: Page, args?: { email?: string; password?: string }) {
  const email =
    args?.email ?? `u${Date.now()}_${Math.random().toString(16).slice(2)}@example.com`;
  const password = args?.password ?? 'password123';

  const csrf = makeCsrfToken();

  await ensureGuest(page);

  await page.context().addCookies([
    {
      name: 'csrf',
      value: csrf,
      url: appBaseUrl,
    },
  ]);

  const res = await page.request.post(`${apiBaseUrl}/auth/register`, {
    headers: {
      origin: appBaseUrl,
      cookie: `csrf=${csrf}`,
      'x-csrf-token': csrf,
      'content-type': 'application/json',
    },
    data: {
      email,
      password,
      passwordConfirm: password,
    },
  });

  const sid = firstCookieValue(res.headers()['set-cookie'], 'sid');
  if (!sid) {
    const body = await res.text().catch(() => '');
    throw new Error(`missing sid cookie from /auth/register (status=${res.status()} body=${body})`);
  }

  await page.context().addCookies([
    {
      name: 'sid',
      value: sid,
      url: appBaseUrl,
      httpOnly: true,
    },
  ]);

  await page.goto('/transactions');
  await expect(page).toHaveURL(/\/transactions$/, { timeout: 30_000 });

  return { email, password };
}
