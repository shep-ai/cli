import { test, expect } from '@playwright/test';

test.describe('Log Detail Page', () => {
  test('should display log detail page', async ({ page }) => {
    // First, navigate to logs list
    await page.goto('/logs');
    await page.waitForSelector('table tbody tr');

    // Get the first log entry ID from the table
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/logs\/[a-f0-9-]+/);

    // Check for log detail heading
    await expect(page.locator('h1')).toContainText('Log Entry');
  });

  test('should display log metadata', async ({ page }) => {
    // Navigate directly to logs page to get an ID
    await page.goto('/logs');
    await page.waitForSelector('table tbody tr');

    // Click first row to navigate to detail
    await page.locator('table tbody tr').first().click();

    // Wait for detail page
    await page.waitForSelector('h1:has-text("Log Entry")');

    // Check for metadata fields
    await expect(page.locator('text=Level')).toBeVisible();
    await expect(page.locator('text=Source')).toBeVisible();
    await expect(page.locator('text=Timestamp')).toBeVisible();
    await expect(page.locator('text=Message')).toBeVisible();
  });

  test('should display context if present', async ({ page }) => {
    // Navigate to logs and find an entry with context
    await page.goto('/logs');
    await page.waitForSelector('table tbody tr');

    // Click first row
    await page.locator('table tbody tr').first().click();
    await page.waitForSelector('h1:has-text("Log Entry")');

    // Look for context section (may or may not exist)
    const contextSection = page.locator('text=Context');
    const hasContext = await contextSection.count();

    if (hasContext > 0) {
      await expect(contextSection).toBeVisible();
    }
  });

  test('should display stack trace if present', async ({ page }) => {
    // Navigate to logs
    await page.goto('/logs');

    // Try to filter for error logs
    await page.selectOption('select[name="level"]', 'error');
    await page.waitForTimeout(500);

    const errorRows = page.locator('table tbody tr');
    const errorCount = await errorRows.count();

    if (errorCount > 0) {
      // Click first error log
      await errorRows.first().click();
      await page.waitForSelector('h1:has-text("Log Entry")');

      // Check if stack trace section exists
      const stackTraceSection = page.locator('text=Stack Trace');
      const hasStackTrace = await stackTraceSection.count();

      if (hasStackTrace > 0) {
        await expect(stackTraceSection).toBeVisible();
      }
    }
  });

  test('should have back to logs button', async ({ page }) => {
    // Navigate to detail page
    await page.goto('/logs');
    await page.waitForSelector('table tbody tr');
    await page.locator('table tbody tr').first().click();

    // Wait for detail page
    await page.waitForSelector('h1:has-text("Log Entry")');

    // Check for back button
    const backButton = page.locator('a:has-text("Back to Logs")');
    await expect(backButton).toBeVisible();

    // Click back button
    await backButton.click();

    // Should navigate back to logs list
    await expect(page).toHaveURL('/logs');
  });
});
