import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts', 'prisma/seed.ts'],
  format: ['esm'],
  target: 'es2022',
  sourcemap: true,
  clean: true,
  dts: false,
  shims: false
});
