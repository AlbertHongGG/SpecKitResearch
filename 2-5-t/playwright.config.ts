import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";
const origin = new URL(baseURL).origin;
const port = new URL(baseURL).port || "3100";
const e2eDbPath = path.join(process.cwd(), ".playwright", "e2e.db");
const databaseUrl = `file:${e2eDbPath}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  globalSetup: "./tests/e2e/global.setup.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      `mkdir -p .playwright && rm -f .playwright/e2e.db .playwright/e2e.db-shm .playwright/e2e.db-wal .playwright/seed.json && DATABASE_URL=\"${databaseUrl}\" npx prisma migrate deploy && DATABASE_URL=\"${databaseUrl}\" npx tsx scripts/seed-e2e.ts && DATABASE_URL=\"${databaseUrl}\" APP_ORIGIN=\"${origin}\" npm run dev -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

