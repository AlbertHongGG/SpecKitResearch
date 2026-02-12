import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setupEnv.ts'],
    // Integration tests currently share the same database and reset tables.
    // Running files in parallel causes cross-test interference.
    fileParallelism: false,
  },
});
