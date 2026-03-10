import { test, expect } from '@playwright/test';

test.describe('Feature Create Drawer — drag-drop attachment flow', () => {
  test('dropping a file shows attachment card in the drawer', async ({ page }) => {
    // Mock the upload API route — return a non-image file so the chip renders text (not <img>)
    await page.route('**/api/attachments/upload', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'att-e2e-001',
          name: 'test-doc.pdf',
          size: 5000,
          mimeType: 'application/pdf',
          path: '/tmp/.shep/attachments/pending-abc/test-doc.pdf',
          createdAt: new Date().toISOString(),
        }),
      })
    );

    // Navigate directly to create drawer route
    await page.goto('/create');

    // Wait for the drawer to appear
    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 15000,
    });

    // Find the drop zone
    const dropZone = page.getByRole('region', { name: 'File drop zone' });
    await expect(dropZone).toBeVisible();

    // Simulate file drop by dispatching a native drop event inside the page context
    await dropZone.evaluate((el) => {
      const dt = new DataTransfer();
      const file = new File(['fake pdf data'], 'test-doc.pdf', { type: 'application/pdf' });
      dt.items.add(file);

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      });
      el.dispatchEvent(dropEvent);
    });

    // Verify the attachment chip appears with the filename
    await expect(page.getByText('test-doc.pdf')).toBeVisible({ timeout: 5000 });
  });

  test('dropping an oversized file shows error without uploading', async ({ page }) => {
    let uploadCalled = false;
    await page.route('**/api/attachments/upload', (route) => {
      uploadCalled = true;
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/create');

    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 15000,
    });

    const dropZone = page.getByRole('region', { name: 'File drop zone' });
    await expect(dropZone).toBeVisible();

    // Simulate dropping an oversized file
    await dropZone.evaluate((el) => {
      const dt = new DataTransfer();
      const file = new File(['x'], 'huge-file.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
      dt.items.add(file);

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      });
      el.dispatchEvent(dropEvent);
    });

    // Error message should appear
    await expect(page.getByText(/exceeds 10 MB/i)).toBeVisible({ timeout: 3000 });

    // Upload API should NOT have been called
    expect(uploadCalled).toBe(false);
  });
});
