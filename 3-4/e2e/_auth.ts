import { expect, type Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);

  const firstLoginRequestPromise = page.waitForRequest((r) => r.url().includes('/api/auth/login'));
  await page.getByRole('button', { name: 'Sign in' }).click();

  const firstReq = await firstLoginRequestPromise;
  if (firstReq.method() === 'OPTIONS') {
    const optionsRes = await firstReq.response();
    if (!optionsRes) {
      throw new Error(`CORS preflight failed: ${firstReq.failure()?.errorText ?? 'no response'}`);
    }
    expect(optionsRes.ok(), `CORS preflight status ${optionsRes.status()}`).toBeTruthy();
  }

  const postReq =
    firstReq.method() === 'POST'
      ? firstReq
      : await page.waitForRequest(
          (r) => r.url().includes('/api/auth/login') && r.method() === 'POST',
          { timeout: 10_000 }
        );

  const loginRes = await postReq.response();
  if (!loginRes) {
    throw new Error(`Login request failed: ${postReq.failure()?.errorText ?? 'no response'}`);
  }
  expect(loginRes.status(), `login response status ${loginRes.status()}`).toBe(200);

  // Give the browser a moment to persist Set-Cookie.
  await page.waitForTimeout(100);

  const allCookies = await page.context().cookies();
  const sessionCookie = allCookies.find((c) => c.name === 'paysim_session');
  expect(sessionCookie, 'expected paysim_session cookie to be set').toBeTruthy();

  const sessionResponsePromise = page.waitForResponse(
    (r) => r.url().includes('/api/auth/session') && r.request().method() === 'GET'
  );

  await page.goto('/orders');
  await expect(page).toHaveURL(/\/orders/);

  const sessionRes = await sessionResponsePromise;
  expect(sessionRes.status(), 'session response status').toBe(200);
}
