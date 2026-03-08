import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm -w backend run dev:e2e',
      port: 3000,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        DATABASE_URL: 'file:./prisma/e2e.db',
        PORT: '3000',
        APP_BASE_URL: 'http://localhost:3000',
        FRONTEND_BASE_URL: 'http://localhost:5173',
        CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
        COOKIE_SECURE: 'false',
        RUN_WEBHOOK_WORKER: 'true',
        RUN_CLEANUP_WORKER: 'true',
      },
    },
    {
      command: 'npm run dev:frontend',
      port: 5173,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_API_BASE_URL: 'http://localhost:3000',
      },
    },
  ],
});
