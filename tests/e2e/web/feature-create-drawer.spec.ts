import { test, expect } from '@playwright/test';

test.describe('Feature Create Drawer — native file attachments', () => {
  test('create feature with attachment shows full absolute file path', async ({ page }) => {
    // Mock the native file picker API route before navigating
    await page.route('**/api/dialog/pick-files', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          files: [
            {
              path: '/Users/test/docs/requirements.pdf',
              name: 'requirements.pdf',
              size: 42000,
            },
          ],
          cancelled: false,
        }),
      })
    );

    // Navigate to control center
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click the sidebar "New feature" button to open the create drawer
    const newFeatureButton = page.locator('button', { hasText: 'New feature' });
    await expect(newFeatureButton).toBeVisible({ timeout: 15000 });
    await newFeatureButton.click();

    // Wait for the drawer to appear — use heading role to avoid matching sidebar text
    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 10000,
    });

    // Fill in the feature name
    const nameInput = page.getByPlaceholder('e.g. GitHub OAuth Login');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Test Feature With Attachment');

    // Click "Add Files" to trigger the mocked native file picker
    const addFilesButton = page.getByRole('button', { name: /add files/i });
    await addFilesButton.click();

    // Verify the attachment card shows the file name (exact match to avoid matching full path)
    await expect(page.getByText('requirements.pdf', { exact: true })).toBeVisible();

    // Verify the attachment card shows the FULL absolute file path
    await expect(page.getByText('/Users/test/docs/requirements.pdf')).toBeVisible();

    // Verify the file size is displayed (42000 bytes = 41.0 KB)
    await expect(page.getByText('41.0 KB')).toBeVisible();

    // Verify the attachment count badge shows (1)
    await expect(page.getByText('(1)')).toBeVisible();

    // Verify the submit button is enabled (name is filled)
    const submitButton = page.getByRole('button', { name: '+ Create Feature' });
    await expect(submitButton).toBeEnabled();

    // Submit the form
    await submitButton.click();
  });

  test('cancelled file picker does not add attachments', async ({ page }) => {
    // Mock the native file picker returning cancelled
    await page.route('**/api/dialog/pick-files', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ files: null, cancelled: true }),
      })
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const newFeatureButton = page.locator('button', { hasText: 'New feature' });
    await expect(newFeatureButton).toBeVisible({ timeout: 15000 });
    await newFeatureButton.click();

    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 10000,
    });

    // Click "Add Files" — picker returns cancelled
    const addFilesButton = page.getByRole('button', { name: /add files/i });
    await addFilesButton.click();

    // No attachment card should appear — wait briefly and verify
    await page.waitForTimeout(500);
    await expect(page.getByText('requirements.pdf', { exact: true })).not.toBeVisible();
  });

  test('multiple files show full paths for each', async ({ page }) => {
    await page.route('**/api/dialog/pick-files', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          files: [
            {
              path: '/Users/test/docs/requirements.pdf',
              name: 'requirements.pdf',
              size: 42000,
            },
            {
              path: '/Users/test/images/screenshot.png',
              name: 'screenshot.png',
              size: 150000,
            },
          ],
          cancelled: false,
        }),
      })
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const newFeatureButton = page.locator('button', { hasText: 'New feature' });
    await expect(newFeatureButton).toBeVisible({ timeout: 15000 });
    await newFeatureButton.click();

    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 10000,
    });

    const addFilesButton = page.getByRole('button', { name: /add files/i });
    await addFilesButton.click();

    // Verify both files show full paths
    await expect(page.getByText('/Users/test/docs/requirements.pdf')).toBeVisible();
    await expect(page.getByText('/Users/test/images/screenshot.png')).toBeVisible();

    // Verify both file names are displayed (exact match to avoid matching full path)
    await expect(page.getByText('requirements.pdf', { exact: true })).toBeVisible();
    await expect(page.getByText('screenshot.png', { exact: true })).toBeVisible();

    // Verify attachment count
    await expect(page.getByText('(2)')).toBeVisible();
  });
});
