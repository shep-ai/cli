import { test, expect } from '@playwright/test';

test.describe('Feature Create Drawer — native file attachments', () => {
  test('create feature with attachment shows file name and size', async ({ page }) => {
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

    // Click the sidebar "New feature" button to open the create drawer
    const newFeatureButton = page.locator('button', { hasText: 'New feature' });
    await expect(newFeatureButton).toBeVisible({ timeout: 15000 });
    await newFeatureButton.click();

    // Wait for the drawer to appear — use heading role to avoid matching sidebar text
    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 10000,
    });

    // Fill in the description (name input was removed — description is now the primary field)
    const descriptionInput = page.getByPlaceholder(
      'e.g. Add GitHub OAuth login with callback handling and token refresh...'
    );
    await expect(descriptionInput).toBeVisible();
    await descriptionInput.fill('Test Feature With Attachment');

    // Click "Attach files" to trigger the mocked native file picker
    const attachFilesButton = page.getByRole('button', { name: /attach files/i });
    await attachFilesButton.click();

    // Verify the attachment chip shows the file name
    await expect(page.getByText('requirements.pdf')).toBeVisible();

    // Verify the file size is displayed (42000 bytes = 41.0 KB)
    await expect(page.getByText('41.0 KB')).toBeVisible();

    // Verify the submit button is enabled (description is filled)
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

    const newFeatureButton = page.locator('button', { hasText: 'New feature' });
    await expect(newFeatureButton).toBeVisible({ timeout: 15000 });
    await newFeatureButton.click();

    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 10000,
    });

    // Click "Attach files" — picker returns cancelled
    const attachFilesButton = page.getByRole('button', { name: /attach files/i });
    await attachFilesButton.click();

    // No attachment chip should appear — wait briefly and verify
    await page.waitForTimeout(500);
    await expect(page.getByText('requirements.pdf')).not.toBeVisible();
  });

  test('multiple files show chips for each', async ({ page }) => {
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

    const newFeatureButton = page.locator('button', { hasText: 'New feature' });
    await expect(newFeatureButton).toBeVisible({ timeout: 15000 });
    await newFeatureButton.click();

    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 10000,
    });

    const attachFilesButton = page.getByRole('button', { name: /attach files/i });
    await attachFilesButton.click();

    // Verify both file names are displayed in chips
    await expect(page.getByText('requirements.pdf')).toBeVisible();
    await expect(page.getByText('screenshot.png')).toBeVisible();
  });
});
