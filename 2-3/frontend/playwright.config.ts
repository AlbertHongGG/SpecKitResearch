import { defineConfig, devices } from '@playwright/test';

const frontendPort = Number(process.env.PLAYWRIGHT_FRONTEND_PORT ?? '5173');
const backendPort = Number(process.env.PLAYWRIGHT_BACKEND_PORT ?? '3000');

process.env.PLAYWRIGHT_BACKEND_BASE_URL ??= `http://localhost:${backendPort}`;

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${frontendPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL,
    trace: 'on-first-retry'
  },
  webServer: [
    {
      command:
        `mkdir -p ../backend/tests/.tmp && pnpm -C ../backend db:generate && DATABASE_URL="file:./tests/.tmp/e2e.db" pnpm -C ../backend prisma migrate deploy && DATABASE_URL="file:./tests/.tmp/e2e.db" pnpm -C ../backend db:seed && DATABASE_URL="file:./tests/.tmp/e2e.db" PORT=${backendPort} NODE_ENV=test pnpm -C ../backend start`,
      url: `http://localhost:${backendPort}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: `NEXT_PUBLIC_API_BASE_URL=http://localhost:${backendPort} pnpm exec next dev --port ${frontendPort}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
