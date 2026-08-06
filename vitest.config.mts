import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 15000,
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
    fileParallelism: false, // integration test nembak DB bersama — harus bergiliran, bukan rebutan
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});