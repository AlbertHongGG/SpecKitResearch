import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'cd .. && npm run dev --workspace backend',
      url: 'http://localhost:4000/session',
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5174/login',
      reuseExistingServer: true,
      timeout: 120_000
    }
  ]
});
