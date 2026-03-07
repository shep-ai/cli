import { test, expect } from '@playwright/test';

test.describe('Settings Page — Control Center', () => {
  test('settings page renders models tab by default and screenshot', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('settings-page-client')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('settings-tab-models')).toBeVisible();
    await expect(page.getByTestId('settings-section-models')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/web/screenshots/settings-models-tab.png',
      fullPage: true,
    });
  });

  test('settings page profile tab screenshot', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('settings-page-client')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('settings-tab-profile').click();
    await expect(page.getByTestId('settings-section-profile')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/web/screenshots/settings-profile-tab.png',
      fullPage: true,
    });
  });

  test('settings page environment tab screenshot', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('settings-page-client')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('settings-tab-environment').click();
    await expect(page.getByTestId('settings-section-environment')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/web/screenshots/settings-environment-tab.png',
      fullPage: true,
    });
  });

  test('settings page system tab screenshot', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('settings-page-client')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('settings-tab-system').click();
    await expect(page.getByTestId('settings-section-system')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/web/screenshots/settings-system-tab.png',
      fullPage: true,
    });
  });

  test('settings page agent tab screenshot', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('settings-page-client')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('settings-tab-agent').click();
    await expect(page.getByTestId('settings-section-agent')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/web/screenshots/settings-agent-tab.png',
      fullPage: true,
    });
  });

  test('settings page notifications tab screenshot', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('settings-page-client')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('settings-tab-notifications').click();
    await expect(page.getByTestId('settings-section-notifications')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/web/screenshots/settings-notifications-tab.png',
      fullPage: true,
    });
  });

  test('settings page workflow tab screenshot', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('settings-page-client')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('settings-tab-workflow').click();
    await expect(page.getByTestId('settings-section-workflow')).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/web/screenshots/settings-workflow-tab.png',
      fullPage: true,
    });
  });

  test('sidebar shows settings nav item screenshot', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-sidebar')).toBeVisible({ timeout: 15000 });

    const settingsLink = page.locator('a[href="/settings"]');
    await expect(settingsLink).toBeVisible();

    await page.screenshot({
      path: 'tests/e2e/web/screenshots/settings-sidebar-nav.png',
      fullPage: true,
    });
  });
});
