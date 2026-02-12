import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'cd .. && npm run dev --workspace backend',
      url: 'http://localhost:3001/session',
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000/login',
      reuseExistingServer: true,
      timeout: 120_000
    }
  ]
});
