import { test, expect } from '@playwright/test';

test.describe('Feature Create Drawer — drag-drop attachment flow', () => {
  test('dropping a file shows attachment card in the drawer', async ({ page }) => {
    // Mock the upload API route
    await page.route('**/api/attachments/upload', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'att-e2e-001',
          name: 'test-screenshot.png',
          size: 5000,
          mimeType: 'image/png',
          path: '.shep/attachments/pending-abc/test-screenshot.png',
          createdAt: new Date().toISOString(),
        }),
      })
    );

    // Navigate to control center
    await page.goto('/');

    // Click the sidebar "New feature" button to open the create drawer
    const newFeatureButton = page.locator('button', { hasText: 'New feature' });
    await expect(newFeatureButton).toBeVisible({ timeout: 15000 });
    await newFeatureButton.click();

    // Wait for the drawer to appear
    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 10000,
    });

    // Find the drop zone
    const dropZone = page.getByRole('region', { name: 'File drop zone' });
    await expect(dropZone).toBeVisible();

    // Simulate file drop using Playwright's DataTransfer
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const file = new File(['fake image data'], 'test-screenshot.png', { type: 'image/png' });
      dt.items.add(file);
      return dt;
    });

    await dropZone.dispatchEvent('drop', { dataTransfer });

    // Verify the attachment card appears with the filename
    await expect(page.getByText('test-screenshot.png')).toBeVisible({ timeout: 5000 });
  });

  test('dropping an oversized file shows error without uploading', async ({ page }) => {
    let uploadCalled = false;
    await page.route('**/api/attachments/upload', (route) => {
      uploadCalled = true;
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/');

    const newFeatureButton = page.locator('button', { hasText: 'New feature' });
    await expect(newFeatureButton).toBeVisible({ timeout: 15000 });
    await newFeatureButton.click();

    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 10000,
    });

    const dropZone = page.getByRole('region', { name: 'File drop zone' });
    await expect(dropZone).toBeVisible();

    // Create a file that reports as >10 MB
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      // Create a small file but override its size property
      const file = new File(['x'], 'huge-file.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
      dt.items.add(file);
      return dt;
    });

    await dropZone.dispatchEvent('drop', { dataTransfer });

    // Error message should appear
    await expect(page.getByText(/exceeds 10 MB/i)).toBeVisible({ timeout: 3000 });

    // Upload API should NOT have been called
    expect(uploadCalled).toBe(false);
  });
});
