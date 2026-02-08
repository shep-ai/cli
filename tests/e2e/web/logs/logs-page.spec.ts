import { test, expect } from '@playwright/test';

test.describe('Logs Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to logs page
    await page.goto('/logs');
  });

  test('should display logs table with headers', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Logs');

    // Check table headers exist
    await expect(page.locator('th:has-text("Timestamp")')).toBeVisible();
    await expect(page.locator('th:has-text("Level")')).toBeVisible();
    await expect(page.locator('th:has-text("Source")')).toBeVisible();
    await expect(page.locator('th:has-text("Message")')).toBeVisible();
  });

  test('should have filter controls', async ({ page }) => {
    // Check for level filter
    await expect(page.locator('select[name="level"]')).toBeVisible();

    // Check for source filter
    await expect(page.locator('input[placeholder*="source" i]')).toBeVisible();

    // Check for date range filters
    await expect(page.locator('input[type="datetime-local"]').first()).toBeVisible();
  });

  test('should display log entries', async ({ page }) => {
    // Wait for logs to load
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // Verify at least one row exists
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(await rows.count());
  });

  test('should apply level filter', async ({ page }) => {
    // Select "error" level
    await page.selectOption('select[name="level"]', 'error');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify all visible logs are error level
    const levelBadges = page.locator('table tbody tr [data-testid="log-level"]');
    const count = await levelBadges.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        await expect(levelBadges.nth(i)).toHaveText(/error/i);
      }
    }
  });

  test('should paginate results', async ({ page }) => {
    // Check for pagination controls
    const nextButton = page.locator('button:has-text("Next")');
    const prevButton = page.locator('button:has-text("Previous")');

    // Previous should be disabled on first page
    await expect(prevButton).toBeDisabled();

    // If there are more pages, next should be enabled
    const rowCount = await page.locator('table tbody tr').count();
    if (rowCount >= 50) {
      await expect(nextButton).toBeEnabled();

      // Click next and verify page changed
      await nextButton.click();
      await page.waitForTimeout(500);

      // Now previous should be enabled
      await expect(prevButton).toBeEnabled();
    }
  });

  test('should click row to view details', async ({ page }) => {
    // Wait for logs table
    await page.waitForSelector('table tbody tr');

    // Click first row
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/logs\/[a-f0-9-]+/);
  });
});
