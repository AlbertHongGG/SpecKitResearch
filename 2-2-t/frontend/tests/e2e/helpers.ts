import { expect, type Page } from '@playwright/test';

export const seedUsers = {
  admin: { email: 'admin@example.com', password: 'password123' },
  instructor: { email: 'instructor@example.com', password: 'password123' },
  student: { email: 'student@example.com', password: 'password123' },
} as const;

export async function login(page: Page, params: { email: string; password: string; redirectTo?: string }) {
  // Use API login + cookie injection to make tests deterministic across ports.
  const res = await page.request.post('http://localhost:3001/auth/login', {
    data: { email: params.email, password: params.password },
  });
  expect(res.ok()).toBeTruthy();

  const setCookie = res
    .headersArray()
    .filter((h) => h.name.toLowerCase() === 'set-cookie')
    .map((h) => h.value)[0];
  if (!setCookie) throw new Error('login response missing set-cookie');

  const cookiePair = setCookie.split(';')[0] ?? '';
  const eq = cookiePair.indexOf('=');
  if (eq <= 0) throw new Error(`cannot parse set-cookie: ${setCookie}`);
  const name = cookiePair.slice(0, eq);
  const value = cookiePair.slice(eq + 1);

  await page.context().addCookies([
    {
      name,
      value,
      url: 'http://localhost:3100',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  const dest = params.redirectTo ?? '/';
  await page.goto(dest);
}

export async function expectOnPath(page: Page, pathname: string) {
  await expect(page).toHaveURL(new RegExp(`${pathname.replaceAll('/', '\\/')}(\\?|$)`));
}
