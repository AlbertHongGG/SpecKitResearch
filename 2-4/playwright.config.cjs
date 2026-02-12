const { devices } = require('@playwright/test');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './tests/e2e',
  testMatch: ['**/*.spec.cjs', '**/*.spec.ts'],
  testIgnore: ['**/fixtures.browser.spec.ts'],
  timeout: 90_000,
  expect: { timeout: 5_000 },
  workers: 1,
  use: {
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
};

module.exports = config;
