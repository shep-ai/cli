import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../../package.json'), 'utf-8')
) as { version: string };

test.describe('Version Page', () => {
  test('should display package name and version', async ({ page }) => {
    await page.goto('/version');

    await expect(page.getByRole('main').locator('h1')).toContainText('@shepai/cli');
    await expect(page.getByTestId('version-badge')).toContainText(/v\d+\.\d+\.\d+/);
  });

  test('should display package description', async ({ page }) => {
    await page.goto('/version');

    await expect(page.locator('main')).toContainText('Autonomous AI Native SDLC Platform');
  });

  test('should have working tabs navigation', async ({ page }) => {
    await page.goto('/version');

    // Wait for page to be ready
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();

    // Verify Overview content is visible by default
    await expect(page.getByRole('tabpanel')).toContainText('Package Information');

    // Verify all three tabs are present
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'System' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Features' })).toBeVisible();
  });

  test('should display version badges', async ({ page }) => {
    await page.goto('/version');

    // Main version badge
    const versionBadge = page.getByTestId('version-badge');
    await expect(versionBadge).toBeVisible();
    await expect(versionBadge).toContainText(`v${pkg.version}`);
  });

  test('should have navigation buttons', async ({ page }) => {
    await page.goto('/version');

    // Back to Home button
    const backButton = page.getByRole('link', { name: 'Back to Home' });
    await expect(backButton).toBeVisible();

    // GitHub button
    const githubButton = page.getByRole('link', { name: 'View on GitHub' });
    await expect(githubButton).toBeVisible();
    await expect(githubButton).toHaveAttribute('href', 'https://github.com/shep-ai/cli');
  });

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/version');

    const backButton = page.getByRole('link', { name: 'Back to Home' });
    await backButton.click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('main').locator('h1')).toContainText('Shep AI');
  });

  test('should display license information', async ({ page }) => {
    await page.goto('/version');

    await expect(page.locator('main')).toContainText('License');
    await expect(page.locator('main')).toContainText('MIT');
  });
});
