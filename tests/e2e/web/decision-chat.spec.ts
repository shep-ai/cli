/**
 * E2E: Decision Review Chat
 *
 * Verifies the decision chat panel works within the tech review and PRD review
 * drawers in the control center. Mocks the /api/decision-chat streaming
 * endpoint so we don't need a real agent, while exercising the full UI flow.
 *
 * Screenshots are captured at each milestone to serve as evidence.
 *
 * Run:  npx playwright test decision-chat
 */

import { test, expect } from '@playwright/test';

// ── Mock streaming response builder ────────────────────────────────────

/** Build a newline-delimited JSON stream simulating agent progress + result. */
function buildStreamBody(tokens: string[]): string {
  const lines: string[] = [];
  for (const token of tokens) {
    lines.push(
      JSON.stringify({
        type: 'progress',
        content: token,
        timestamp: new Date().toISOString(),
      })
    );
  }
  lines.push(
    JSON.stringify({
      type: 'result',
      content: tokens.join(''),
      timestamp: new Date().toISOString(),
    })
  );
  return lines.map((l) => `${l}\n`).join('');
}

const MOCK_RESPONSE_TOKENS = [
  'The **React framework** was chosen ',
  'because it provides a component-based architecture ',
  'that aligns well with the existing codebase. ',
  'Alternatives like Vue and Svelte were considered ',
  'but rejected due to team expertise and ecosystem maturity.',
];

// ── Config ─────────────────────────────────────────────────────────────

// Allow overriding the base URL for testing against a specific dev server
// e.g. DECISION_CHAT_URL=http://localhost:3002 npx playwright test decision-chat
test.use({
  baseURL: process.env.DECISION_CHAT_URL ?? undefined,
});

// ── Tests ──────────────────────────────────────────────────────────────

test.describe('Decision Review Chat — Tech Review', () => {
  test('user can send a message and receive a streaming agent response in the tech review drawer', async ({
    page,
  }) => {
    // ── Mock the decision-chat API route ─────────────────────────────
    await page.route('**/api/decision-chat', (route) => {
      const body = buildStreamBody(MOCK_RESPONSE_TOKENS);
      return route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body,
      });
    });

    // ── Navigate to the control center ──────────────────────────────
    await page.goto('/');
    await expect(page.locator('[data-testid="control-center"]')).toBeVisible({
      timeout: 15_000,
    });

    // ── Find a feature node in tech-review state ────────────────────
    // Tech review = lifecycle "implementation" + state "action-required"
    // Identified by the "Review Technical Planning" badge
    const techReviewBadge = page
      .getByTestId('feature-node-badge')
      .filter({ hasText: 'Review Technical Planning' });

    const hasTechReview = await techReviewBadge
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    test.skip(
      !hasTechReview,
      'No feature in tech-review state — requires a feature with "Review Technical Planning" badge'
    );

    // ── Screenshot 1: Control center with tech-review node visible ──
    await page.screenshot({
      path: 'test-results/decision-chat/01-control-center-tech-review-node.png',
      fullPage: true,
    });

    // ── Click the tech-review feature node to open the drawer ───────
    const techReviewCard = page.getByTestId('feature-node-card').filter({
      has: techReviewBadge,
    });
    await techReviewCard.first().click();

    // Wait for the tech review drawer to load
    const approveButton = page.getByRole('button', { name: 'Approve Plan' });
    await expect(approveButton).toBeVisible({ timeout: 10_000 });

    // Verify the chat input is present
    const chatInput = page.getByPlaceholder('Ask about these decisions...');
    await expect(chatInput).toBeVisible();

    // ── Screenshot 2: Tech review drawer open with chat panel ───────
    await page.screenshot({
      path: 'test-results/decision-chat/02-tech-review-drawer-with-chat.png',
      fullPage: true,
    });

    // ── Type and send a chat message ────────────────────────────────
    await chatInput.fill('Why was React chosen over Vue for this feature?');

    // Verify send button is enabled
    const sendButton = page.getByRole('button', { name: 'Send' });
    await expect(sendButton).toBeEnabled();

    // ── Screenshot 3: Chat input filled, ready to send ──────────────
    await page.screenshot({
      path: 'test-results/decision-chat/03-chat-input-filled.png',
      fullPage: true,
    });

    // Send the message
    await sendButton.click();

    // ── Verify user message appears in the chat ─────────────────────
    const userMessage = page.getByTestId('chat-message-user');
    await expect(userMessage.first()).toBeVisible({ timeout: 5_000 });
    await expect(userMessage.first()).toContainText('Why was React chosen');

    // ── Verify assistant response streams in ────────────────────────
    const assistantMessage = page.getByTestId('chat-message-assistant');
    await expect(assistantMessage.first()).toBeVisible({ timeout: 10_000 });

    // Wait for the full streamed response to complete
    await expect(assistantMessage.first()).toContainText('component-based architecture', {
      timeout: 10_000,
    });

    // ── Screenshot 4: Chat conversation with user + assistant ───────
    await page.screenshot({
      path: 'test-results/decision-chat/04-chat-conversation-complete.png',
      fullPage: true,
    });

    // ── Verify approve/reject buttons still accessible ──────────────
    await expect(approveButton).toBeVisible();
    await expect(approveButton).toBeEnabled();

    const rejectButton = page.getByRole('button', { name: 'Reject' });
    await expect(rejectButton).toBeVisible();

    // ── Verify chat input is re-enabled after streaming completes ───
    await expect(chatInput).toBeEnabled();

    // ── Send a follow-up message ────────────────────────────────────
    await chatInput.fill('What about Svelte?');
    await sendButton.click();

    // Verify second user message appears
    await expect(userMessage.nth(1)).toBeVisible({ timeout: 5_000 });
    await expect(userMessage.nth(1)).toContainText('What about Svelte');

    // Wait for second assistant response
    await expect(assistantMessage.nth(1)).toBeVisible({ timeout: 10_000 });

    // ── Screenshot 5: Multi-turn conversation ───────────────────────
    await page.screenshot({
      path: 'test-results/decision-chat/05-multi-turn-conversation.png',
      fullPage: true,
    });
  });
});

test.describe('Decision Review Chat — PRD Review', () => {
  test('user can send a message and receive a streaming agent response in the PRD review drawer', async ({
    page,
  }) => {
    // ── Mock the decision-chat API route ─────────────────────────────
    await page.route('**/api/decision-chat', (route) => {
      const body = buildStreamBody([
        'The **session-based persistence** option was recommended ',
        'because it balances user experience with implementation simplicity. ',
        'Database persistence would add significant scope for conversations ',
        'that are only relevant during a single review cycle.',
      ]);
      return route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body,
      });
    });

    // ── Navigate to the control center ──────────────────────────────
    await page.goto('/');
    await expect(page.locator('[data-testid="control-center"]')).toBeVisible({
      timeout: 15_000,
    });

    // ── Find a feature node in PRD review state ─────────────────────
    const prdReviewBadge = page
      .getByTestId('feature-node-badge')
      .filter({ hasText: 'Review Product Requirements' });

    const hasPrdReview = await prdReviewBadge
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    test.skip(
      !hasPrdReview,
      'No feature in PRD review state — requires a feature with "Review Product Requirements" badge'
    );

    // ── Click the PRD review feature node to open the drawer ────────
    const prdReviewCard = page.getByTestId('feature-node-card').filter({
      has: prdReviewBadge,
    });
    await prdReviewCard.first().click();

    // Wait for the PRD questionnaire to load
    const approveButton = page.getByRole('button', { name: /approve/i }).first();
    await expect(approveButton).toBeVisible({ timeout: 10_000 });

    // Verify the chat input is present
    const chatInput = page.getByPlaceholder('Ask about these decisions...');
    await expect(chatInput).toBeVisible();

    // ── Screenshot 1: PRD review drawer with chat panel ─────────────
    await page.screenshot({
      path: 'test-results/decision-chat/06-prd-review-drawer-with-chat.png',
      fullPage: true,
    });

    // ── Type and send a message ─────────────────────────────────────
    await chatInput.fill('Why is session persistence recommended over database storage?');
    const sendButton = page.getByRole('button', { name: 'Send' });
    await sendButton.click();

    // Verify user message appears
    const userMessage = page.getByTestId('chat-message-user');
    await expect(userMessage.first()).toBeVisible({ timeout: 5_000 });

    // Wait for assistant response
    const assistantMessage = page.getByTestId('chat-message-assistant');
    await expect(assistantMessage.first()).toBeVisible({ timeout: 10_000 });
    await expect(assistantMessage.first()).toContainText('session-based persistence', {
      timeout: 10_000,
    });

    // ── Screenshot 2: PRD chat conversation ─────────────────────────
    await page.screenshot({
      path: 'test-results/decision-chat/07-prd-chat-conversation.png',
      fullPage: true,
    });

    // ── Verify approve button remains accessible ────────────────────
    await expect(approveButton).toBeVisible();
  });
});

test.describe('Decision Review Chat — Error Handling', () => {
  test('displays an error message when the chat API fails', async ({ page }) => {
    // ── Mock the decision-chat API to return an error ────────────────
    await page.route('**/api/decision-chat', (route) => {
      const errorBody = JSON.stringify({
        type: 'error',
        content: 'Agent is temporarily unavailable. Please try again.',
        timestamp: new Date().toISOString(),
      });
      return route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: `${errorBody}\n`,
      });
    });

    await page.goto('/');
    await expect(page.locator('[data-testid="control-center"]')).toBeVisible({
      timeout: 15_000,
    });

    // Find any review node (tech or PRD)
    const techReviewBadge = page
      .getByTestId('feature-node-badge')
      .filter({ hasText: 'Review Technical Planning' });
    const prdReviewBadge = page
      .getByTestId('feature-node-badge')
      .filter({ hasText: 'Review Product Requirements' });

    const hasTech = await techReviewBadge
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasPrd = await prdReviewBadge
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);

    test.skip(!hasTech && !hasPrd, 'No feature in review state for error handling test');

    // Click whichever review node is available
    const reviewCard = hasTech
      ? page.getByTestId('feature-node-card').filter({ has: techReviewBadge })
      : page.getByTestId('feature-node-card').filter({ has: prdReviewBadge });
    await reviewCard.first().click();

    // Wait for the drawer to load
    const chatInput = page.getByPlaceholder('Ask about these decisions...');
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    // Send a message
    await chatInput.fill('Test error handling');
    const sendButton = page.getByRole('button', { name: 'Send' });
    await sendButton.click();

    // Verify error message appears (system message bubble has role="alert")
    const errorAlert = page.locator('[role="alert"]').filter({ hasText: 'unavailable' });
    await expect(errorAlert).toBeVisible({ timeout: 10_000 });
    await expect(errorAlert).toContainText('Agent is temporarily unavailable');

    // ── Screenshot: Error state in chat ─────────────────────────────
    await page.screenshot({
      path: 'test-results/decision-chat/08-chat-error-state.png',
      fullPage: true,
    });

    // Verify input is re-enabled after error
    await expect(chatInput).toBeEnabled();
  });
});
