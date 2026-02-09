import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Shep AI Web UI E2E tests.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e/web',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Increase workers in CI to match 4-core GitHub runner
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  // Increase timeout for CI environment
  timeout: process.env.CI ? 60000 : 30000,

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Always use Chromium only to keep tests fast and consistent
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm --filter @shepai/web dev:e2e',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
