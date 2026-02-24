/**
 * SSE Mock Helper for Playwright E2E tests.
 *
 * Blocks the Service Worker so the `useAgentEvents` hook falls back to
 * a direct EventSource, then replaces EventSource with a controllable mock.
 * This lets tests inject NotificationEvent payloads at precise moments
 * without a running backend or real agent.
 */

import type { Page } from '@playwright/test';

// ── Types (mirrors @shepai/core/domain/generated/output) ────────────────

export interface NotificationEvent {
  eventType: string;
  agentRunId: string;
  featureId: string;
  featureName: string;
  phaseName?: string;
  message: string;
  severity: string;
  timestamp: string;
}

export const EventType = {
  AgentStarted: 'agent_started',
  PhaseCompleted: 'phase_completed',
  WaitingApproval: 'waiting_approval',
  AgentCompleted: 'agent_completed',
  AgentFailed: 'agent_failed',
} as const;

export const Severity = {
  Info: 'info',
  Warning: 'warning',
  Success: 'success',
  Error: 'error',
} as const;

// ── Init script ─────────────────────────────────────────────────────────

/**
 * Registers an `addInitScript` that:
 *  1. Blocks Service Worker registration (forces EventSource fallback)
 *  2. Replaces the global `EventSource` with a mock that the test controls
 *
 * Must be called BEFORE `page.goto()`.
 */
export async function installSseMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // ---------- 1. Block SW so the hook falls back to EventSource ----------
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = () =>
        Promise.reject(new Error('[sse-mock] SW blocked for E2E test'));
    }

    // ---------- 2. Mock EventSource -----------------------------------------

    const instances: any[] = [];
    (window as any).__mockEventSources = instances;

    class MockEventSource {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSED = 2;

      url: string;
      readyState = 0;
      onopen: ((e: Event) => void) | null = null;
      onerror: ((e: Event) => void) | null = null;
      onmessage: ((e: MessageEvent) => void) | null = null;

      private _listeners: Record<string, ((e: any) => void)[]> = {};

      constructor(url: string) {
        this.url = url;
        instances.push(this);

        // Simulate successful connection on next microtask
        setTimeout(() => {
          if (this.readyState === 2) return; // already closed
          this.readyState = 1;
          this.onopen?.(new Event('open'));
        }, 50);
      }

      addEventListener(type: string, listener: (e: any) => void) {
        if (!this._listeners[type]) this._listeners[type] = [];
        this._listeners[type].push(listener);
      }

      removeEventListener(type: string, listener: (e: any) => void) {
        if (!this._listeners[type]) return;
        this._listeners[type] = this._listeners[type].filter((l) => l !== listener);
      }

      dispatchEvent(event: Event) {
        const listeners = this._listeners[(event as any).type] || [];
        for (const fn of listeners) fn(event);
        return true;
      }

      close() {
        this.readyState = 2;
      }
    }

    // Replace global
    (window as any).EventSource = MockEventSource;
  });
}

// ── Event injection ─────────────────────────────────────────────────────

/**
 * Injects a single NotificationEvent into the mock EventSource.
 * The event flows through the same code-path as real SSE: the hook's
 * `notification` listener fires, React state updates, and the
 * notification + control-center hooks react.
 */
export async function injectEvent(page: Page, event: NotificationEvent): Promise<void> {
  await page.evaluate((e) => {
    const sources: any[] = (window as any).__mockEventSources ?? [];
    for (const source of sources) {
      if (source.readyState === 1) {
        const msgEvent = new MessageEvent('notification', {
          data: JSON.stringify(e),
        });
        source.dispatchEvent(msgEvent);
      }
    }
  }, event);
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Convenience builder — fills in defaults so tests only specify what differs. */
export function makeEvent(
  featureName: string,
  overrides: Partial<NotificationEvent> = {}
): NotificationEvent {
  const { featureId = 'e2e-feat-001', ...rest } = overrides;
  return {
    eventType: EventType.AgentStarted,
    agentRunId: 'e2e-showcase-run',
    featureId,
    featureName,
    message: '',
    severity: Severity.Info,
    timestamp: new Date().toISOString(),
    ...rest,
  };
}
