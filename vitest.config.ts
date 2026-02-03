import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'tests/**/*.spec.ts',
      'tests/**/*.spec.tsx',
    ],
    exclude: ['node_modules', 'dist'],
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
      // More specific aliases first
      {
        find: '@/components',
        replacement: resolve(__dirname, './src/presentation/web/components'),
      },
      { find: '@/lib', replacement: resolve(__dirname, './src/presentation/web/lib') },
      { find: '@/hooks', replacement: resolve(__dirname, './src/presentation/web/hooks') },
      { find: '@/types', replacement: resolve(__dirname, './src/presentation/web/types') },
      // General alias last
      { find: '@', replacement: resolve(__dirname, './src') },
      { find: '@tests', replacement: resolve(__dirname, './tests') },
    ],
  },
});
