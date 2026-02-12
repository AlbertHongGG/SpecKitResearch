import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: __dirname,
  use: {
    baseURL: process.env.APP_ORIGIN ?? 'http://localhost:3000',
  },
  webServer: [],
});
