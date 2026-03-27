import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['**/e2e/**', '**/node_modules/**'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/node_modules/**', '**/tests/**', '**/*.config.*'],
    },
  },
  resolve: {
    alias: {
      '@project/db': path.resolve(__dirname, './packages/db/src'),
      '@project/auth': path.resolve(__dirname, './packages/auth/src'),
      '@project/shared': path.resolve(__dirname, './packages/shared/src'),
    },
  },
});
