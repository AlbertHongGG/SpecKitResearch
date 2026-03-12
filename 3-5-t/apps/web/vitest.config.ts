import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/tests/e2e/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
    ],
    passWithNoTests: true,
  },
});
