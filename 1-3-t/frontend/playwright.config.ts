import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: [
    {
      command:
        'rm -f ../backend/prisma/e2e.db && pnpm -C ../backend exec prisma migrate deploy && pnpm -C ../backend dev',
      port: 3000,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        DATABASE_URL: 'file:./prisma/e2e.db',
        NODE_ENV: 'test',
      },
    },
    {
      command: 'pnpm dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
