/**
 * E2E tests for the Chat tab interactive agent flow.
 *
 * All interactive session API endpoints are mocked via page.route() so
 * no real agent process is spawned during testing. The SSE stream endpoint
 * is mocked to return a single delta + done event pair.
 */

import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const TEST_FEATURE_ID = `e2e-chat-${randomUUID().slice(0, 8)}`;
const TEST_SESSION_ID = `sess-${randomUUID().slice(0, 8)}`;

function getDb(): Database.Database {
  const dbPath = process.env.SHEP_HOME
    ? join(process.env.SHEP_HOME, 'data')
    : join(homedir(), '.shep', 'data');
  return new Database(dbPath);
}

function seedFeature(db: Database.Database): void {
  const now = Date.now();
  const repo = db.prepare('SELECT id, path FROM repositories LIMIT 1').get() as
    | { id: string; path: string }
    | undefined;

  db.prepare(
    `INSERT OR REPLACE INTO features (
      id, name, slug, description, user_query, repository_path, branch,
      lifecycle, messages, plan, related_artifacts, agent_run_id, spec_path,
      fast, push, open_pr, auto_merge, allow_prd, allow_plan, allow_merge,
      worktree_path, repository_id, pr_url, pr_number, pr_status,
      commit_hash, ci_status, ci_fix_attempts, ci_fix_history,
      parent_id, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )`
  ).run(
    TEST_FEATURE_ID,
    'E2E Chat Test Feature',
    'e2e-chat-test',
    'Test interactive chat feature',
    'Test interactive chat',
    repo?.path ?? '/tmp/e2e-test-repo',
    'feature/e2e-chat-test',
    'Implementation',
    '[]',
    null,
    '[]',
    null,
    null,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    '/tmp/e2e-chat-worktree',
    repo?.id ?? null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    now,
    now
  );
}

function cleanupFeature(db: Database.Database): void {
  db.prepare('DELETE FROM features WHERE id = ?').run(TEST_FEATURE_ID);
}

/** Mock all interactive session API endpoints on the given page. */
async function mockInteractiveApis(page: Page): Promise<void> {
  // POST /api/interactive/sessions — start session
  await page.route('**/api/interactive/sessions', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sessionId: TEST_SESSION_ID }),
      });
    }
    return route.continue();
  });

  // GET /api/interactive/sessions/:id — check session status (returns 'ready')
  await page.route(`**/api/interactive/sessions/${TEST_SESSION_ID}`, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: TEST_SESSION_ID,
          featureId: TEST_FEATURE_ID,
          status: 'ready',
          startedAt: Date.now(),
          lastActivityAt: Date.now(),
        }),
      });
    }
    // DELETE /api/interactive/sessions/:id — stop session
    if (route.request().method() === 'DELETE') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    }
    return route.continue();
  });

  // GET /api/interactive/sessions/:id/messages — list messages
  let messages: {
    id: string;
    featureId: string;
    role: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }[] = [
    {
      id: 'msg-greeting',
      featureId: TEST_FEATURE_ID,
      role: 'assistant',
      content: 'Hey, how can I help?',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  await page.route(`**/api/interactive/sessions/${TEST_SESSION_ID}/messages`, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(messages),
      });
    }
    // POST — send user message (202 accepted)
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { content: string };
      messages = [
        ...messages,
        {
          id: `msg-user-${Date.now()}`,
          featureId: TEST_FEATURE_ID,
          role: 'user',
          content: body.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `msg-response-${Date.now()}`,
          featureId: TEST_FEATURE_ID,
          role: 'assistant',
          content: 'I can help you with that feature.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      return route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    }
    return route.continue();
  });

  // GET /api/interactive/sessions/:id/stream — SSE with a greeting delta+done
  await page.route(`**/api/interactive/sessions/${TEST_SESSION_ID}/stream`, (route) => {
    const sseBody = [
      `event: delta\ndata: {"delta":"I can help you with that feature.","sessionId":"${TEST_SESSION_ID}"}\n\n`,
      `event: done\ndata: {"done":true,"sessionId":"${TEST_SESSION_ID}"}\n\n`,
    ].join('');
    return route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body: sseBody,
    });
  });
}

test.describe('Chat tab — interactive agent flow', () => {
  let db: Database.Database;

  test.beforeAll(() => {
    db = getDb();
    seedFeature(db);
  });

  test.afterAll(() => {
    if (db) {
      cleanupFeature(db);
      db.close();
    }
  });

  test('full happy-path: open chat tab → start agent → message → stop', async ({ page }) => {
    await mockInteractiveApis(page);

    // Navigate to the feature detail page
    await page.goto(`/feature/${TEST_FEATURE_ID}`);

    // Wait for the drawer heading
    await expect(page.getByRole('heading', { name: 'E2E Chat Test Feature' })).toBeVisible({
      timeout: 15_000,
    });

    // Click the Chat tab
    const chatTabButton = page.getByRole('tab', { name: /chat/i });
    await expect(chatTabButton).toBeVisible({ timeout: 5_000 });
    await chatTabButton.click();

    // Idle state: "Start interactive agent" button visible
    const startButton = page.getByRole('button', { name: /start interactive agent/i });
    await expect(startButton).toBeVisible({ timeout: 5_000 });

    // Click start
    await startButton.click();

    // Booting state: expect a boot stage indicator — use .first() since both
    // the status badge and the status text may match
    await expect(page.getByText(/spawning|loading.context|starting session/i).first()).toBeVisible({
      timeout: 5_000,
    });

    // Wait for ready state — session mock returns 'ready' immediately, so polling finds it fast
    // The chat input should appear when ready
    const chatInput = page.getByRole('textbox', { name: /message|chat/i });
    await expect(chatInput).toBeVisible({ timeout: 15_000 });

    // The greeting message from the mock should appear
    await expect(page.getByText('Hey, how can I help?')).toBeVisible({ timeout: 5_000 });

    // Send a message
    await chatInput.fill('What is the current status?');
    await chatInput.press('Enter');

    // User message should appear (either optimistically or after refetch)
    await expect(page.getByText('What is the current status?')).toBeVisible({ timeout: 10_000 });

    // Stop agent button should be visible
    const stopButton = page.getByRole('button', { name: /stop/i });
    await expect(stopButton).toBeVisible({ timeout: 5_000 });
    await stopButton.click();

    // After stop: Restart agent button should appear
    await expect(page.getByRole('button', { name: /restart agent/i })).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe('Chat tab — hidden when interactive agent is disabled', () => {
  let db: Database.Database;

  test.beforeAll(() => {
    db = getDb();
    // Feature should already exist from the other describe block,
    // but seed again in case tests run independently
    try {
      seedFeature(db);
    } catch {
      // Already exists — OK
    }
  });

  test.afterAll(() => {
    if (db) {
      // Restore settings in case test left them disabled
      try {
        db.prepare(`UPDATE settings SET interactive_agent_enabled = 1 WHERE 1=1`).run();
      } catch {
        // Column may not exist — OK
      }
      cleanupFeature(db);
      db.close();
    }
  });

  test('Chat tab is absent when interactiveAgent.enabled = false in settings', async ({ page }) => {
    // Navigate to settings page and disable interactive agent via the UI toggle.
    // This updates both the DB and the in-memory settings singleton on the server.
    await page.goto('/settings');

    // Wait for settings page to load
    const section = page.getByTestId('interactive-agent-settings-section');
    await expect(section).toBeVisible({ timeout: 15_000 });

    // Scroll to the interactive agent section
    await section.scrollIntoViewIfNeeded();

    // Find the enable switch and turn it off
    const enableSwitch = page.getByTestId('switch-interactive-agent-enabled');
    await expect(enableSwitch).toBeVisible({ timeout: 5_000 });

    // Check if it's currently checked (enabled) and click to disable
    const isChecked = await enableSwitch.getAttribute('data-state');
    if (isChecked === 'checked') {
      await enableSwitch.click();
      // Wait for the save to complete
      await page.waitForTimeout(500);
    }

    // Now navigate to the feature detail page
    await page.goto(`/feature/${TEST_FEATURE_ID}`);

    // Wait for the drawer heading
    await expect(page.getByRole('heading', { name: 'E2E Chat Test Feature' })).toBeVisible({
      timeout: 15_000,
    });

    // Chat tab should NOT be present in the tab bar
    const chatTabButton = page.getByRole('tab', { name: /^chat$/i });
    await expect(chatTabButton).not.toBeVisible({ timeout: 3_000 });

    // Re-enable interactive agent for subsequent tests
    await page.goto('/settings');
    await expect(section).toBeVisible({ timeout: 15_000 });
    await section.scrollIntoViewIfNeeded();
    const switchAfter = page.getByTestId('switch-interactive-agent-enabled');
    const stateAfter = await switchAfter.getAttribute('data-state');
    if (stateAfter === 'unchecked') {
      await switchAfter.click();
      await page.waitForTimeout(500);
    }
  });
});
