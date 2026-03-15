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

    // Mock the upload-from-path endpoint — the file doesn't exist on CI
    await page.route('**/api/attachments/upload-from-path', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'att-test-001',
          name: 'requirements.pdf',
          size: 42000,
          mimeType: 'application/pdf',
          path: '/tmp/.shep/attachments/pending/requirements.pdf',
          createdAt: new Date().toISOString(),
        }),
      })
    );

    // Navigate directly to create drawer route (repo param required to enable submit)
    await page.goto('/create?repo=/fake/repo');

    // Wait for the drawer to appear — use heading role to avoid matching sidebar text
    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 15000,
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

    await page.goto('/create?repo=/fake/repo');

    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 15000,
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

    // Mock upload-from-path to return per-file responses based on request body
    await page.route('**/api/attachments/upload-from-path', async (route) => {
      const body = route.request().postDataJSON() as { path: string };
      const name = body.path.split('/').pop()!;
      const sizeMap: Record<string, number> = {
        'requirements.pdf': 42000,
        'screenshot.png': 150000,
      };
      const mimeMap: Record<string, string> = {
        'requirements.pdf': 'application/pdf',
        'screenshot.png': 'image/png',
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `att-${name.replace('.', '-')}`,
          name,
          size: sizeMap[name] ?? 1000,
          mimeType: mimeMap[name] ?? 'application/octet-stream',
          path: `/tmp/.shep/attachments/pending/${name}`,
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/create?repo=/fake/repo');

    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 15000,
    });

    const attachFilesButton = page.getByRole('button', { name: /attach files/i });
    await attachFilesButton.click();

    // Verify both file names are displayed in chips
    // Image files render as <img> thumbnails with title attribute, non-images show text
    await expect(page.getByText('requirements.pdf')).toBeVisible();
    await expect(page.locator('[title="screenshot.png"]')).toBeVisible();
  });
});
