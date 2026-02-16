import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Exclude Playwright specs (*.spec.ts) and manual tests (*.manual.test.ts) - they use @playwright/test and manual runner
    exclude: [
      'node_modules',
      'dist',
      'tests/e2e/**/*.spec.ts',
      'tests/e2e/**/*.spec.tsx',
      'tests/manual/**/*.manual.test.ts',
      'tests/manual/**/*.manual.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'tests', '**/*.d.ts', '**/*.config.*'],
    },
    testTimeout: 10000,
    // Use jsdom for all tests - component tests need it, node tests are fine with it
    environment: 'jsdom',
    setupFiles: ['tests/unit/presentation/web/setup.ts'],
  },
  resolve: {
    alias: [
      // @shepai/core workspace package
      { find: '@shepai/core', replacement: resolve(__dirname, './packages/core/src') },
      // More specific aliases first
      {
        find: '@/components',
        replacement: resolve(__dirname, './src/presentation/web/components'),
      },
      { find: '@/lib', replacement: resolve(__dirname, './src/presentation/web/lib') },
      { find: '@/hooks', replacement: resolve(__dirname, './src/presentation/web/hooks') },
      { find: '@/app', replacement: resolve(__dirname, './src/presentation/web/app') },
      { find: '@/types', replacement: resolve(__dirname, './src/presentation/web/types') },
      // @cli alias matches web tsconfig: @cli/* → src/* (root package)
      { find: '@cli', replacement: resolve(__dirname, './src') },
      // General alias last
      { find: '@', replacement: resolve(__dirname, './src') },
      { find: '@tests', replacement: resolve(__dirname, './tests') },
    ],
  },
});
