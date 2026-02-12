/// <reference types="vitest" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    // E2E 測試由 Playwright 負責，避免 Vitest 誤載入 @playwright/test 檔案。
    exclude: ['tests/e2e/**'],
  },
} as any);
