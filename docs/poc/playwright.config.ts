import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'npx serve . -l 4173 --no-clipboard',
    port: 4173,
    reuseExistingServer: true,
  },
});
