import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const WEB_ORIGIN = process.env.E2E_WEB_ORIGIN ?? 'http://localhost:3100';
const API_ORIGIN = process.env.E2E_API_ORIGIN ?? 'http://localhost:4100';
const ROOT_DIR = path.resolve(process.cwd(), '../..');
const E2E_DB_FILE = path.resolve(ROOT_DIR, 'tests/e2e/e2e.db');
const E2E_DATABASE_URL = `file:${E2E_DB_FILE}`;

export default defineConfig({
  testDir: '../../tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: WEB_ORIGIN,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  globalSetup: './playwright.global-setup',
  webServer: [
    {
      command: 'pnpm -C ../api start:e2e',
      url: `${API_ORIGIN}/healthz`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        JOBS_ENABLED: 'false',
        APP_ORIGIN: WEB_ORIGIN,
        DATABASE_URL: E2E_DATABASE_URL,
        PORT: '4100',
        API_PORT: '4100',
      },
    },
    {
      command: 'pnpm dev -- . -p 3100',
      url: WEB_ORIGIN,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        NEXT_PUBLIC_API_ORIGIN: API_ORIGIN,
        PORT: '3100',
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
