import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // E2E specs are executed by Playwright, not Vitest.
    exclude: ['test/e2e/**', '**/node_modules/**', '**/.next/**', '**/dist/**', '**/out/**'],
    passWithNoTests: true,
  },
});
