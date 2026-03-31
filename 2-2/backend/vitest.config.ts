import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.spec.ts'],
    setupFiles: ['test/vitest.setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
})
