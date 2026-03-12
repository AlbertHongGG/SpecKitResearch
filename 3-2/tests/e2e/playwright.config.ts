import { defineConfig } from '@playwright/test';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  testDir: __dirname,
  use: {
    baseURL: process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173',
  },
  webServer: [
    {
      cwd: path.join(repoRoot, 'apps', 'backend'),
      command:
        'set PORT=3000&& set APP_ORIGIN=http://127.0.0.1:5173&& set SESSION_SECRET=dev-session-secret-32chars-min&& set DATABASE_URL=file:./e2e.db&& npx prisma db push --force-reset --accept-data-loss && npm run db:seed && npm run dev:once',
      url: 'http://127.0.0.1:3000/auth/csrf',
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      cwd: path.join(repoRoot, 'apps', 'frontend'),
      command: 'set NEXT_PUBLIC_API_ORIGIN=http://127.0.0.1:3000&& npm run dev',
      url: 'http://127.0.0.1:5173',
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
