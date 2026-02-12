import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
    vmMemoryLimit: '256MB',
  },
})
