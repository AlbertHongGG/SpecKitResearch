import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendPort = 5174;
const backendPort = 4000;

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, '../../..');
const backendDir = path.join(repoRoot, 'backend');
const frontendDir = path.join(repoRoot, 'frontend');

export default defineConfig({
  testDir: './',
  globalSetup: './global-setup.ts',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://localhost:${frontendPort}`,
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: `npm --prefix "${backendDir}" run dev`,
      url: `http://localhost:${backendPort}/api/health`,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: `npm --prefix "${frontendDir}" run dev -- --port ${frontendPort}`,
      url: `http://localhost:${frontendPort}`,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
