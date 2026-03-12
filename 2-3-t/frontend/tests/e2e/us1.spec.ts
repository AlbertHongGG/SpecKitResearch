import { test, expect } from '@playwright/test';

import { createKeyViaUi, findKeyIdFromToken, loginViaUi, registerViaUi, uniqueEmail } from './helpers';

const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:3101';

test('US1 e2e: register → login → create key (show once) → gateway call → usage visible', async ({ page }) => {
  const email = uniqueEmail('dev');
  const password = 'correct-horse-battery-staple';

  await registerViaUi(page, { email, password });
  await loginViaUi(page, { email, password });

  const { plainKey } = await createKeyViaUi(page, { name: 'My Key', scopeKey: 'demo.read' });
  const keyId = await findKeyIdFromToken(plainKey);

  const gw = await page.request.get(`${BACKEND_URL}/gateway/demo/hello`, {
    headers: { authorization: `Bearer ${plainKey}` },
  });
  expect(gw.status()).toBe(200);

  await page.goto(`/keys/${encodeURIComponent(keyId)}/usage`);

  // Usage writes are async; poll by reloading until we see the gateway call.
  const deadline = Date.now() + 6_000;
  while (Date.now() < deadline) {
    const text = await page.textContent('body');
    if (text?.includes('/hello') && (text.includes('200') || text.includes(' 200 '))) break;
    await page.waitForTimeout(200);
    await page.reload();
  }

  await expect(page.getByText('/hello')).toBeVisible();
  await expect(page.getByText('200')).toBeVisible();
});
