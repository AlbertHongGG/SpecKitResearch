import { test, expect, type Browser } from '@playwright/test';

import { loginViaUi, registerViaUi, uniqueEmail } from './helpers';

const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:3101';

async function loginAdmin(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginViaUi(page, { email: 'admin@example.com', password: 'admin-admin-admin' });
  return { context, page };
}

test('US2 e2e: admin creates catalog → developer sees /docs → disable hides it', async ({ browser }) => {
  const { context: adminContext, page: adminPage } = await loginAdmin(browser);

  const slug = `svc-${Date.now()}`;
  const scopeKey = `scope.${Date.now()}`;

  const createSvc = await adminPage.request.post(`${BACKEND_URL}/admin/services`, {
    data: { slug, name: 'E2E Service', upstreamUrl: 'http://localhost:4000' },
  });
  expect(createSvc.status()).toBe(201);
  const svcJson = await createSvc.json();
  const serviceId = svcJson.item.id as string;

  const createEp = await adminPage.request.post(`${BACKEND_URL}/admin/endpoints`, {
    data: { serviceId, name: 'Hello', method: 'GET', pathPattern: '/hello' },
  });
  expect(createEp.status()).toBe(201);
  const epJson = await createEp.json();
  const endpointId = epJson.item.id as string;

  const createScope = await adminPage.request.post(`${BACKEND_URL}/admin/scopes`, {
    data: { key: scopeKey, description: 'E2E scope' },
  });
  expect(createScope.status()).toBe(201);
  const scopeJson = await createScope.json();
  const scopeId = scopeJson.item.id as string;

  const addRule = await adminPage.request.post(`${BACKEND_URL}/admin/scope-rules`, {
    data: { endpointId, scopeId },
  });
  expect(addRule.status()).toBe(201);

  const devContext = await browser.newContext();
  const devPage = await devContext.newPage();
  const email = uniqueEmail('dev');
  const password = 'correct-horse-battery-staple';
  await registerViaUi(devPage, { email, password });
  await loginViaUi(devPage, { email, password });

  await devPage.goto('/docs');
  await expect(devPage.getByRole('heading', { name: 'Docs' })).toBeVisible();
  const svcCard = devPage.locator('div.rounded.border', { hasText: slug });
  await expect(svcCard).toBeVisible();
  await expect(svcCard.getByText(slug)).toBeVisible();
  await expect(svcCard.getByText('GET', { exact: true })).toBeVisible();
  await expect(svcCard.getByText('/hello', { exact: true })).toBeVisible();
  await expect(svcCard.getByText(scopeKey)).toBeVisible();

  const disableSvc = await adminPage.request.patch(`${BACKEND_URL}/admin/services/${encodeURIComponent(serviceId)}`, {
    data: { status: 'DISABLED' },
  });
  expect(disableSvc.status()).toBe(200);

  await devPage.reload();
  await expect(devPage.getByText(slug)).toHaveCount(0);

  await adminContext.close();
  await devContext.close();
});
