import { FullConfig } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

async function globalSetup(_config: FullConfig) {
  // DB migration + seeding happens in playwright.config.ts webServer.command.
  // Keep this hook for future extensions; ensure the seed file exists for tests.
  const seedFile = path.join(process.cwd(), ".playwright", "seed.json");
  try {
    await fs.access(seedFile);
  } catch {
    // If someone runs tests without webServer, they should run the seeder manually.
    // eslint-disable-next-line no-console
    console.warn(`[playwright] seed.json missing at ${seedFile}`);
  }
}

export default globalSetup;
