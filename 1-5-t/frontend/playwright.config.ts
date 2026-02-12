import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  globalTeardown: './tests/e2e/globalTeardown',
  webServer: [
    {
      command:
        'cd .. && rm -f backend/prisma/e2e.db backend/prisma/e2e.db-wal backend/prisma/e2e.db-shm && cd backend && npx prisma migrate deploy && npm run db:seed && npm run dev',
      port: 3000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        JWT_SECRET: 'test-secret',
        DATABASE_URL: 'file:./prisma/e2e.db',
        PORT: '3000',
      },
    },
    {
      command: 'cd .. && npm --workspace frontend run dev -- --host 127.0.0.1 --port 5173',
      port: 5173,
      reuseExistingServer: false,
    },
  ],
});
