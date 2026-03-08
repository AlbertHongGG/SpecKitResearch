import { expect, type Page } from '@playwright/test';

export const WEB_ORIGIN = process.env.E2E_WEB_ORIGIN ?? 'http://localhost:3100';
export const API_ORIGIN = process.env.E2E_API_ORIGIN ?? 'http://localhost:4100';

async function getCsrfToken(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  const token = cookies.find((c) => c.name === 'csrfToken')?.value;
  if (!token) throw new Error('Missing csrfToken cookie');
  return token;
}

export async function apiLogin(page: Page, creds: { email: string; password: string }) {
  const res = await page.request.post(`${API_ORIGIN}/auth/login`, {
    data: creds,
    headers: {
      origin: WEB_ORIGIN,
    },
  });
  expect(res.ok()).toBeTruthy();
}

export async function apiSetActiveOrg(page: Page, organizationId: string) {
  const csrfToken = await getCsrfToken(page);
  const res = await page.request.put(`${API_ORIGIN}/orgs/active`, {
    data: { organizationId },
    headers: {
      origin: WEB_ORIGIN,
      'X-CSRF-Token': csrfToken,
    },
  });
  expect(res.ok()).toBeTruthy();
}

export async function apiRunGraceExpirationJob(page: Page, nowIso?: string) {
  const csrfToken = await getCsrfToken(page);
  const res = await page.request.post(`${API_ORIGIN}/internal/jobs/grace-expiration/run`, {
    data: nowIso ? { now: nowIso } : {},
    headers: {
      origin: WEB_ORIGIN,
      'X-CSRF-Token': csrfToken,
    },
  });
  expect(res.ok()).toBeTruthy();
}

export async function gotoApp(page: Page, path: string) {
  await page.goto(`${WEB_ORIGIN}${path}`);
}
