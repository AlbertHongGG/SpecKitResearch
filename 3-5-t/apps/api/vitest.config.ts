import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['html', 'json-summary', 'text-summary'],
      reportsDirectory: 'coverage/test',
      include: ['src/**/*.ts'],
      exclude: ['dist/**'],
    },
  },
});

