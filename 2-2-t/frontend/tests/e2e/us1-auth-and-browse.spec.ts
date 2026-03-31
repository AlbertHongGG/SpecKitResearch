import { test, expect } from '@playwright/test';

const seededProvider = {
  email: 'provider@example.com',
  password: 'Password123!',
};

test('US1: guest can browse services and login/register with role redirects', async ({ page }) => {
  const requestFailures: string[] = [];
  const serviceResponses: Array<{ url: string; status: number }> = [];
  const consoleErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api') && url.includes('services')) {
      serviceResponses.push({ url, status: res.status() });
    }
  });

  page.on('requestfailed', (req) => {
    requestFailures.push(`${req.method()} ${req.url()} -> ${req.failure()?.errorText ?? 'failed'}`);
  });

  // Guest browse: services list -> detail
  await page.goto('/services');

  const servicesHeading = page.getByRole('heading', { name: 'Services' });
  const errorText = page.getByText('Error loading services.');

  await Promise.race([
    servicesHeading.waitFor({ state: 'visible', timeout: 10_000 }),
    errorText.waitFor({ state: 'visible', timeout: 10_000 }),
  ]);

  if (await errorText.isVisible()) {
    const diag = await page.evaluate(async () => {
      try {
        const r = await fetch('http://localhost:4000/api/services', {
          headers: { Accept: 'application/json' },
        });
        const text = await r.text();
        return {
          ok: r.ok,
          status: r.status,
          headers: Object.fromEntries(r.headers.entries()),
          text: text.slice(0, 5000),
          pageUrl: window.location.href,
        };
      } catch (e) {
        return { error: String(e), pageUrl: window.location.href };
      }
    });

    const pageUrl =
      typeof diag === 'object' && diag !== null && 'pageUrl' in diag
        ? String((diag as { pageUrl?: unknown }).pageUrl ?? '')
        : '';

    throw new Error(
      `Services page failed to load.\n` +
        `pageUrl=${pageUrl}\n` +
        `fetchDiag=${JSON.stringify(diag)}\n` +
        `serviceResponses=${JSON.stringify(serviceResponses)}\n` +
        `consoleErrors=\n${consoleErrors.join('\n')}\n` +
        `requestFailures=\n${requestFailures.join('\n')}`,
    );
  }

  const firstServiceLink = page.locator('a[href^="/services/"]').first();
  await expect(firstServiceLink).toBeVisible();
  await firstServiceLink.click();

  await expect(page.getByRole('heading', { name: 'Open time slots' })).toBeVisible();

  // Login as seeded Provider -> provider dashboard
  await page.getByRole('link', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

  await page.getByLabel('Email').fill(seededProvider.email);
  await page.getByLabel('Password').fill(seededProvider.password);
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page).toHaveURL(/\/provider\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Provider dashboard' })).toBeVisible();

  // Logout returns to guest header
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();

  // Register as a new User -> services
  await page.getByRole('link', { name: 'Register' }).click();
  await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible();

  const uniqueEmail = `e2e-user-${Date.now()}@example.com`;
  await page.getByLabel('Email').fill(uniqueEmail);
  await page.getByLabel('Password').fill('Password123!');
  await page.getByLabel('Role').selectOption('USER');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole('link', { name: 'My Bookings' })).toBeVisible();
});
