import { test, expect } from '@playwright/test';

test.describe('Optimistic node clickability — drawer opens on other nodes while feature is creating', () => {
  test('clicking existing feature nodes opens the detail drawer while an optimistic node is in creating state', async ({
    page,
  }) => {
    // Intercept createFeature server action to delay it (keep optimistic node in "creating" state)
    await page.route('**/*', async (route) => {
      const request = route.request();
      if (request.method() === 'POST' && request.headers()['next-action']) {
        const body = request.postData();
        if (body && body.includes('E2E Optimistic Clickability Test')) {
          // Delay for 15 seconds — long enough to click other nodes
          await new Promise((resolve) => setTimeout(resolve, 15000));
          await route.fulfill({
            status: 200,
            contentType: 'text/x-component',
            body: '1:{"error":"Test intercepted"}\n',
          });
          return;
        }
      }
      await route.continue();
    });

    // Navigate to control center
    await page.goto('/');

    // Wait for the canvas to render with existing feature nodes
    const featureCards = page.locator('[data-testid="feature-node-card"]');
    await expect(featureCards.first()).toBeVisible({ timeout: 30000 });

    // Count existing feature nodes — we need at least 2 to test clicking while one is creating
    const existingCount = await featureCards.count();
    test.skip(existingCount < 1, 'Need at least 1 existing feature node to test clickability');

    // Remember the name of the first existing (non-creating) feature node for drawer verification
    const firstNodeHeading = page
      .locator('[data-testid="feature-node-card"]:not([aria-busy="true"]) h3')
      .first();
    const firstNodeName = await firstNodeHeading.textContent();

    // Step 1: Open the create-feature drawer from the sidebar
    const newFeatureButton = page.locator('button', { hasText: 'New feature' });
    await expect(newFeatureButton).toBeVisible({ timeout: 10000 });
    await newFeatureButton.click();

    // Wait for the create drawer heading
    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 10000,
    });

    // Step 2: Fill the feature name and submit
    const nameInput = page.getByPlaceholder('e.g. GitHub OAuth Login');
    await nameInput.fill('E2E Optimistic Clickability Test');

    const submitButton = page.getByRole('button', { name: '+ Create Feature' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Step 3: Verify the optimistic node appeared with "Creating..." text
    await expect(page.getByText('Creating...').first()).toBeVisible({ timeout: 5000 });

    // Verify the optimistic node has aria-busy="true"
    const creatingNode = page.locator('[data-testid="feature-node-card"][aria-busy="true"]');
    await expect(creatingNode).toBeVisible();
    await expect(creatingNode).toContainText('E2E Optimistic Clickability Test');

    // Step 4: While the optimistic node is in "creating" state, click on an EXISTING feature node
    // First, get the first non-creating feature node
    const clickableNode = page
      .locator('[data-testid="feature-node-card"]:not([aria-busy="true"])')
      .first();
    await expect(clickableNode).toBeVisible();
    await clickableNode.click();

    // Step 5: Verify the feature detail drawer opens for the clicked node
    const drawerHeader = page.locator('[data-testid="feature-drawer-header"]');
    await expect(drawerHeader).toBeVisible({ timeout: 5000 });

    // The drawer should show the name of the clicked feature
    if (firstNodeName) {
      await expect(drawerHeader).toContainText(firstNodeName);
    }

    // Step 6: Verify the optimistic node is STILL in "creating" state (server action is still pending)
    await expect(creatingNode).toBeVisible();
    await expect(creatingNode).toHaveAttribute('aria-busy', 'true');

    // Step 7: Close the drawer by pressing Escape
    await page.keyboard.press('Escape');
    await expect(drawerHeader).not.toBeVisible({ timeout: 3000 });

    // Step 8: Click a different existing node (if available) to verify multiple clicks work
    const secondClickableNode = page
      .locator('[data-testid="feature-node-card"]:not([aria-busy="true"])')
      .nth(1);

    if ((await secondClickableNode.count()) > 0) {
      await secondClickableNode.click();

      // Drawer should open again for the second node
      await expect(drawerHeader).toBeVisible({ timeout: 5000 });

      // Close again
      await page.keyboard.press('Escape');
      await expect(drawerHeader).not.toBeVisible({ timeout: 3000 });
    }

    // Step 9: Verify clicking the CREATING node does NOT open the drawer
    await creatingNode.click();
    await page.waitForTimeout(500);
    await expect(drawerHeader).not.toBeVisible();
  });
});

test.describe('All feature nodes open a drawer on click', () => {
  test('clicking each non-creating feature node opens some drawer', async ({ page }) => {
    // Navigate to control center
    await page.goto('/');

    // Wait for the canvas to render with feature nodes
    const featureCards = page.locator('[data-testid="feature-node-card"]');
    await expect(featureCards.first()).toBeVisible({ timeout: 30000 });

    // Get all non-creating feature nodes
    const clickableNodes = page.locator(
      '[data-testid="feature-node-card"]:not([aria-busy="true"])'
    );
    const nodeCount = await clickableNodes.count();
    test.skip(nodeCount < 1, 'Need at least 1 feature node to test drawer opening');

    const drawerHeader = page.locator('[data-testid="feature-drawer-header"]');

    // Click each feature node and verify a drawer opens
    for (let i = 0; i < nodeCount; i++) {
      const node = clickableNodes.nth(i);
      const nodeName = await node.locator('h3').textContent();

      // Click the feature node
      await node.click();

      // Verify some drawer opens (either basic FeatureDrawer or specialized ReviewDrawerShell)
      await expect(drawerHeader).toBeVisible({
        timeout: 5000,
      });

      // Verify the drawer shows the correct feature name
      if (nodeName) {
        await expect(drawerHeader).toContainText(nodeName);
      }

      // Close the drawer before clicking the next node
      await page.keyboard.press('Escape');
      await expect(drawerHeader).not.toBeVisible({ timeout: 3000 });
    }
  });
});
