import { test, expect, type Browser } from '@playwright/test';

import { createKeyViaUi, findKeyIdFromToken, loginViaUi, registerViaUi, uniqueEmail } from './helpers';

const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:3101';

async function loginAdmin(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginViaUi(page, { email: 'admin@example.com', password: 'admin-admin-admin' });
  return { context, page };
}

test('US3 e2e: admin blocks key and disables user (requests fail immediately)', async ({ browser }) => {
  const devContext = await browser.newContext();
  const devPage = await devContext.newPage();

  const email = uniqueEmail('dev');
  const password = 'correct-horse-battery-staple';
  await registerViaUi(devPage, { email, password });
  await loginViaUi(devPage, { email, password });

  const sessionRes = await devPage.request.get(`${BACKEND_URL}/session`);
  expect(sessionRes.status()).toBe(200);
  const session = await sessionRes.json();
  expect(session.authenticated).toBe(true);
  const userId = session.user.id as string;

  const { plainKey } = await createKeyViaUi(devPage, { name: 'KeyForUS3', scopeKey: 'demo.read' });
  const keyId = await findKeyIdFromToken(plainKey);

  const gwOk = await devPage.request.get(`${BACKEND_URL}/gateway/demo/hello`, {
    headers: { authorization: `Bearer ${plainKey}` },
  });
  expect(gwOk.status()).toBe(200);

  // Block key as admin (UI action).
  const { context: adminContext, page: adminPage } = await loginAdmin(browser);
  await adminPage.goto('/admin/keys');
  await adminPage.getByPlaceholder('key id').fill(keyId);
  await Promise.all([
    adminPage.waitForResponse((res) => {
      try {
        return (
          res.request().method() === 'POST' &&
          new URL(res.url()).pathname === `/admin/keys/${encodeURIComponent(keyId)}/block`
        );
      } catch {
        return false;
      }
    }),
    adminPage.getByRole('button', { name: 'Block' }).click(),
  ]);

  const gwBlocked = await devPage.request.get(`${BACKEND_URL}/gateway/demo/hello`, {
    headers: { authorization: `Bearer ${plainKey}` },
  });
  expect(gwBlocked.status()).toBe(401);

  await devPage.goto('/keys');
  await devPage.reload();
  await expect(devPage.getByText('KeyForUS3')).toBeVisible();
  await expect(devPage.getByText('BLOCKED')).toBeVisible();

  // Disable user as admin.
  await adminPage.goto('/admin/users');
  await adminPage.getByPlaceholder('user id').fill(userId);
  await Promise.all([
    adminPage.waitForResponse((res) => {
      try {
        return (
          res.request().method() === 'POST' &&
          new URL(res.url()).pathname === `/admin/users/${encodeURIComponent(userId)}/disable`
        );
      } catch {
        return false;
      }
    }),
    adminPage.getByRole('button', { name: 'Disable user' }).click(),
  ]);

  const sessionAfterDisable = await devPage.request.get(`${BACKEND_URL}/session`);
  expect(sessionAfterDisable.status()).toBe(200);
  expect((await sessionAfterDisable.json()).authenticated).toBe(false);

  await devPage.goto('/keys');
  await expect(devPage.getByText('載入失敗')).toBeVisible();

  await adminContext.close();
  await devContext.close();
});
