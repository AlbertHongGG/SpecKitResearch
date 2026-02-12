import { defineConfig, devices } from '@playwright/test';

const frontendUrl = process.env.E2E_FRONTEND_URL ?? 'http://localhost:3100';
const backendUrl = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm -C ../backend build && pnpm -C ../backend start:e2e',
      url: `${backendUrl}/courses`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 node scripts/start-e2e.mjs',
      url: `${frontendUrl}/`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
