import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    // Only include manual test files
    include: ['tests/manual/**/*.manual.test.ts', 'tests/manual/**/*.manual.test.tsx'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000, // Longer timeout for manual tests (real API calls)
    environment: 'jsdom',
    setupFiles: ['tests/unit/presentation/web/setup.ts'],
  },
  resolve: {
    alias: [
      {
        find: '@/components',
        replacement: resolve(__dirname, './src/presentation/web/components'),
      },
      { find: '@/lib', replacement: resolve(__dirname, './src/presentation/web/lib') },
      { find: '@/hooks', replacement: resolve(__dirname, './src/presentation/web/hooks') },
      { find: '@/types', replacement: resolve(__dirname, './src/presentation/web/types') },
      { find: '@', replacement: resolve(__dirname, './src') },
      { find: '@tests', replacement: resolve(__dirname, './tests') },
    ],
  },
});
