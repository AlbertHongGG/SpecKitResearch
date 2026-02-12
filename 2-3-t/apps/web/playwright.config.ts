import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3100';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: [
    {
      command: 'pnpm --dir ../api dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      env: {
        COOKIE_SECRET: process.env.COOKIE_SECRET ?? 'dev-cookie-secret-please-change',
        DATABASE_URL: process.env.DATABASE_URL ?? 'file:../../data/app.db',
        WEB_ORIGIN: process.env.WEB_ORIGIN ?? baseURL,
      },
    },
    {
      command: 'pnpm dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: process.env.PORT ?? new URL(baseURL).port,
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
      },
    },
  ],
  use: {
    baseURL,
  },
});
