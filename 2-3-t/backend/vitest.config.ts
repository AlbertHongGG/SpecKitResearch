import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
      },
      module: { type: 'es6' },
      sourceMaps: true,
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
    pool: 'forks',
    testTimeout: 30_000,
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['html', 'json-summary', 'text-summary'],
      reportsDirectory: 'coverage/test',
      include: ['src/**/*.ts'],
      exclude: ['test/**/*.ts', 'dist/**'],
    },
  },
});

