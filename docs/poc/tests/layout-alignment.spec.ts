import { test, expect } from '@playwright/test';

test.describe('Layout alignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Set cleared flag and remove data so demo data doesn't load
    await page.evaluate(() => {
      localStorage.setItem('featureFlowCleared', 'true');
      localStorage.removeItem('featureFlowData');
      localStorage.removeItem('featureFlowRepos');
      localStorage.removeItem('featureEnvironments');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('repo pill and feature card centers are vertically aligned', async ({ page }) => {
    // Programmatically add a repo and a feature
    await page.evaluate(() => {
      const app = (window as any).app;
      const repo = app.state.addRandomRepository();
      repo.onCanvas = true;
      app.state.createFeature({
        title: 'Test Feature',
        description: 'Test',
        repositoryId: repo.id,
        phaseId: 0,
      });
      app.state.save();
      app.render();
    });

    const repoPill = page.locator('.canvas-repo-pill').first();
    const featureCard = page.locator('[data-feature-id]').first();
    await expect(repoPill).toBeVisible();
    await expect(featureCard).toBeVisible();

    const pillBox = await repoPill.boundingBox();
    const cardBox = await featureCard.boundingBox();
    expect(pillBox).toBeTruthy();
    expect(cardBox).toBeTruthy();

    const pillCenterY = pillBox!.y + pillBox!.height / 2;
    const cardCenterY = cardBox!.y + cardBox!.height / 2;

    // Centers should be within 2px
    expect(Math.abs(pillCenterY - cardCenterY)).toBeLessThanOrEqual(2);
  });

  test('add-repo button aligns with where next repo pill appears', async ({ page }) => {
    // Add one repo with a feature (needed so addNewRepository adds directly instead of opening file browser)
    await page.evaluate(() => {
      const app = (window as any).app;
      const repo = app.state.addRandomRepository();
      repo.onCanvas = true;
      app.state.createFeature({
        title: 'Existing Feature',
        description: 'Test',
        repositoryId: repo.id,
        phaseId: 0,
      });
      app.state.save();
      app.render();
    });

    const addBtn = page.locator('.canvas-add-repo-btn');
    await expect(addBtn).toBeVisible();
    const addBtnBox = await addBtn.boundingBox();
    expect(addBtnBox).toBeTruthy();
    const addBtnCenterY = addBtnBox!.y + addBtnBox!.height / 2;

    // Click add repo
    await addBtn.click();

    const secondPill = page.locator('.canvas-repo-pill').nth(1);
    await expect(secondPill).toBeVisible();
    const secondPillBox = await secondPill.boundingBox();
    expect(secondPillBox).toBeTruthy();
    const secondPillCenterY = secondPillBox!.y + secondPillBox!.height / 2;

    // Add-repo button center should match new pill center within 2px
    expect(Math.abs(addBtnCenterY - secondPillCenterY)).toBeLessThanOrEqual(2);
  });

  test('repo pill does not jump when feature is added', async ({ page }) => {
    // Add one repo, no features
    await page.evaluate(() => {
      const app = (window as any).app;
      const repo = app.state.addRandomRepository();
      repo.onCanvas = true;
      app.state.save();
      app.render();
    });

    const repoPill = page.locator('.canvas-repo-pill').first();
    await expect(repoPill).toBeVisible();
    const beforeBox = await repoPill.boundingBox();
    expect(beforeBox).toBeTruthy();
    const beforeCenterY = beforeBox!.y + beforeBox!.height / 2;

    // Add a feature to the repo
    await page.evaluate(() => {
      const app = (window as any).app;
      const repo = app.state.getCanvasRepos()[0];
      app.state.createFeature({
        title: 'New Feature',
        description: 'Test',
        repositoryId: repo.id,
        phaseId: 0,
      });
      app.state.save();
      app.render();
    });

    await expect(page.locator('[data-feature-id]').first()).toBeVisible();
    const afterBox = await repoPill.boundingBox();
    expect(afterBox).toBeTruthy();
    const afterCenterY = afterBox!.y + afterBox!.height / 2;

    // Pill center should not move (within 2px)
    expect(Math.abs(beforeCenterY - afterCenterY)).toBeLessThanOrEqual(2);
  });
});
