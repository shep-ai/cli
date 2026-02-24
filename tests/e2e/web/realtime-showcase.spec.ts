/**
 * E2E Showcase: Realtime Feature Lifecycle
 *
 * Produces a VIDEO recording that demonstrates the full realtime
 * notification and feature-node lifecycle pipeline:
 *
 *   1. Toast notifications (info / warning / success / error)
 *   2. Sound effects (button, notification, celebration, caution)
 *   3. Feature-node state transitions (creating → running → action-required → done → error)
 *   4. Lifecycle phase changes (requirements → research → implementation → completed)
 *
 * The test injects synthetic SSE events via a mock EventSource so it
 * requires NO running agent — only the Next.js dev server.
 *
 * To produce the showcase video:
 *   npx playwright test realtime-showcase --project showcase
 *
 * Video is written to test-results/.
 */

import { test, expect } from '@playwright/test';
import { installSseMock, injectEvent, makeEvent, EventType, Severity } from './helpers/sse-mock';

// ── Per-test config ─────────────────────────────────────────────────────

test.use({
  // Allow audio autoplay without user gesture so sounds play in the video
  launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  // Record video for this showcase suite
  video: 'on',
});

// ── Constants ───────────────────────────────────────────────────────────

const FEATURE_NAME = 'OAuth Login';

/** Delay between events — long enough for the video to clearly show each transition. */
const EVENT_GAP_MS = 2_500;

// ── Helpers ─────────────────────────────────────────────────────────────

/** Wait for a Sonner toast containing the given text. */
async function expectToast(page: import('@playwright/test').Page, text: string) {
  const toast = page.locator('[data-sonner-toast]').filter({ hasText: text });
  await expect(toast.first()).toBeVisible({ timeout: 5_000 });
}

// ── Tests ───────────────────────────────────────────────────────────────

test.describe('Showcase: Realtime Feature Lifecycle', () => {
  test('full agent lifecycle with notifications, sounds, and node state transitions', async ({
    page,
  }) => {
    // ── 1. Setup: mock EventSource, block server actions after initial load ──

    await installSseMock(page);

    // Flag: once flipped, POST server-actions and RSC refresh requests hang,
    // keeping the optimistic node alive and preventing data reconciliation.
    let blockMutations = false;

    await page.route('**/*', async (route) => {
      const req = route.request();
      const headers = req.headers();

      if (blockMutations) {
        // Hold server-action calls (POST with Next-Action header)
        const isServerAction = req.method() === 'POST' && headers['next-action'];
        // Hold RSC refresh fetches triggered by router.refresh()
        const isRscRefresh =
          req.method() === 'GET' && headers['rsc'] && req.url().includes('localhost');

        if (isServerAction || isRscRefresh) {
          // Don't call fulfill/continue/abort — the request just hangs.
          return;
        }
      }

      await route.continue();
    });

    // ── 2. Navigate and wait for the page shell ─────────────────────────

    await page.goto('/');

    // The control-center or empty-state should render
    const controlCenter = page.getByTestId('control-center');
    const emptyState = page.getByTestId('control-center-empty-state');

    // Wait for either the canvas or the empty state
    await expect(controlCenter.or(emptyState)).toBeVisible({ timeout: 15_000 });

    const canvasVisible = await controlCenter.isVisible();

    // Enable sounds via localStorage
    await page.evaluate(() => localStorage.setItem('shep-sound-enabled', 'true'));

    // ── 3. Create a feature node via the UI ─────────────────────────────
    //    The node appears immediately (optimistic) — the server-action
    //    is held so the node stays on screen for the entire showcase.

    // Click the sidebar "New feature" button
    const newFeatureButton = page.locator('button', { hasText: 'New feature' });
    await expect(newFeatureButton).toBeVisible({ timeout: 5_000 });
    await newFeatureButton.click();

    // Wait for the create-feature drawer
    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).toBeVisible({
      timeout: 5_000,
    });

    // Fill the feature name
    const nameInput = page.getByPlaceholder('e.g. GitHub OAuth Login');
    await expect(nameInput).toBeVisible();
    await nameInput.fill(FEATURE_NAME);

    // Block mutations BEFORE submitting so the optimistic node stays
    blockMutations = true;

    // Submit — creates an optimistic node with state="creating"
    const submitButton = page.getByRole('button', { name: '+ Create Feature' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Drawer should close
    await expect(page.getByRole('heading', { name: 'NEW FEATURE' })).not.toBeVisible({
      timeout: 5_000,
    });

    // If the canvas is visible, the node should appear with our feature name
    if (canvasVisible) {
      await expect(page.getByText(FEATURE_NAME).first()).toBeVisible({ timeout: 5_000 });
    }

    // Brief pause before the event sequence starts (visual clarity in video)
    await page.waitForTimeout(1_500);

    // ── 4. Event sequence: walk through the full agent lifecycle ─────────

    // -- 4a. Agent Started → "running" state (blue), info toast, button sound
    await injectEvent(
      page,
      makeEvent(FEATURE_NAME, {
        eventType: EventType.AgentStarted,
        message: 'Agent started analyzing repository',
        severity: Severity.Info,
      })
    );
    await expectToast(page, 'Agent started');
    await page.waitForTimeout(EVENT_GAP_MS);

    // -- 4b. Phase: analyze complete → lifecycle: "requirements"
    await injectEvent(
      page,
      makeEvent(FEATURE_NAME, {
        eventType: EventType.PhaseCompleted,
        phaseName: 'analyze',
        message: 'Completed requirements analysis',
        severity: Severity.Info,
      })
    );
    await expectToast(page, 'Completed requirements');
    await page.waitForTimeout(EVENT_GAP_MS);

    // -- 4c. Phase: research complete → lifecycle: "research"
    await injectEvent(
      page,
      makeEvent(FEATURE_NAME, {
        eventType: EventType.PhaseCompleted,
        phaseName: 'research',
        message: 'Completed technical research',
        severity: Severity.Info,
      })
    );
    await expectToast(page, 'Completed technical research');
    await page.waitForTimeout(EVENT_GAP_MS);

    // -- 4d. Waiting Approval → "action-required" state (amber), warning toast, notification sound
    await injectEvent(
      page,
      makeEvent(FEATURE_NAME, {
        eventType: EventType.WaitingApproval,
        phaseName: 'plan',
        message: 'Waiting for plan approval',
        severity: Severity.Warning,
      })
    );
    await expectToast(page, 'Waiting for plan approval');
    await page.waitForTimeout(EVENT_GAP_MS);

    // -- 4e. Agent resumes → "running" state (blue), lifecycle: "implementation"
    await injectEvent(
      page,
      makeEvent(FEATURE_NAME, {
        eventType: EventType.AgentStarted,
        phaseName: 'implement',
        message: 'Agent resumed — implementing feature',
        severity: Severity.Info,
      })
    );
    await expectToast(page, 'Agent resumed');
    await page.waitForTimeout(EVENT_GAP_MS);

    // -- 4f. Phase: implement complete
    await injectEvent(
      page,
      makeEvent(FEATURE_NAME, {
        eventType: EventType.PhaseCompleted,
        phaseName: 'implement',
        message: 'Implementation complete',
        severity: Severity.Info,
      })
    );
    await expectToast(page, 'Implementation complete');
    await page.waitForTimeout(EVENT_GAP_MS);

    // -- 4g. Agent Completed → "done" state (green), success toast, celebration sound
    await injectEvent(
      page,
      makeEvent(FEATURE_NAME, {
        eventType: EventType.AgentCompleted,
        message: 'Feature completed successfully!',
        severity: Severity.Success,
      })
    );
    await expectToast(page, 'Feature completed');
    await page.waitForTimeout(EVENT_GAP_MS);

    // -- 4h. (Bonus) Agent Failed → "error" state (red), error toast, caution sound
    await injectEvent(
      page,
      makeEvent(FEATURE_NAME, {
        eventType: EventType.AgentFailed,
        message: 'Build failed — test suite errors',
        severity: Severity.Error,
      })
    );
    await expectToast(page, 'Build failed');

    // Hold the final frame for video
    await page.waitForTimeout(3_000);
  });
});
