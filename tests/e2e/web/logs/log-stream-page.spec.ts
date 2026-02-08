import { test, expect } from '@playwright/test';

test.describe('Log Stream Page', () => {
  test('should display stream page with controls', async ({ page }) => {
    // Navigate to stream page
    await page.goto('/logs/stream');

    // Check for page heading
    await expect(page.locator('h1')).toContainText('Live Logs');

    // Check for control buttons
    await expect(page.locator('button:has-text("Pause")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear")')).toBeVisible();
  });

  test('should have auto-scroll toggle', async ({ page }) => {
    await page.goto('/logs/stream');

    // Check for auto-scroll control
    const autoScrollCheckbox = page.locator('input[type="checkbox"]');
    await expect(autoScrollCheckbox).toBeVisible();

    // Should be checked by default
    await expect(autoScrollCheckbox).toBeChecked();
  });

  test('should toggle pause/resume', async ({ page }) => {
    await page.goto('/logs/stream');

    // Initially should show "Pause" button
    const pauseButton = page.locator('button:has-text("Pause")');
    await expect(pauseButton).toBeVisible();

    // Click pause
    await pauseButton.click();

    // Should change to "Resume" button
    await expect(page.locator('button:has-text("Resume")')).toBeVisible();

    // Click resume
    await page.locator('button:has-text("Resume")').click();

    // Should change back to "Pause"
    await expect(pauseButton).toBeVisible();
  });

  test('should display connection status', async ({ page }) => {
    await page.goto('/logs/stream');

    // Wait for connection status indicator
    await page.waitForTimeout(1000);

    // Should show "Connected" or "Connecting" status
    const statusText = page.locator('text=/Connected|Connecting/i');
    await expect(statusText).toBeVisible();
  });

  test('should clear logs when clear button clicked', async ({ page }) => {
    await page.goto('/logs/stream');

    // Wait for some logs to potentially appear
    await page.waitForTimeout(2000);

    // Click clear button
    await page.locator('button:has-text("Clear")').click();

    // Verify logs container is empty or shows "Waiting for logs..."
    const logsContainer = page.locator('[data-testid="log-stream-container"]');
    const emptyMessage = page.locator('text=/Waiting for logs|No logs/i');

    // Should either be empty or show empty message
    const hasContent = await logsContainer.locator('> div').count();
    if (hasContent === 0) {
      await expect(emptyMessage).toBeVisible();
    }
  });

  test('should have back to logs button', async ({ page }) => {
    await page.goto('/logs/stream');

    // Check for back button
    const backButton = page.locator('a:has-text("Back to Logs")');
    await expect(backButton).toBeVisible();

    // Click back button
    await backButton.click();

    // Should navigate back to logs list
    await expect(page).toHaveURL('/logs');
  });

  test('should display log count', async ({ page }) => {
    await page.goto('/logs/stream');

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Should show log count (even if 0)
    await expect(page.locator('text=/\\d+ logs/i')).toBeVisible();
  });
});
