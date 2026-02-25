/**
 * SSE API Route Integration Tests
 *
 * Tests for the GET /api/agent-events SSE endpoint that streams
 * notification events via DB polling with per-connection delta cache.
 *
 * These tests mock the DI container (resolve()) to inject fake
 * repositories, then exercise the route handler directly.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentRunStatus, NotificationEventType } from '@/domain/generated/output.js';
import type { Feature, AgentRun, PhaseTiming } from '@/domain/generated/output.js';

// --- Mock DI container via server-container ---

const mockFeatures: Feature[] = [];
const mockRuns = new Map<string, AgentRun>();
const mockTimings = new Map<string, PhaseTiming[]>();

const mockListFeatures = { execute: vi.fn(async () => [...mockFeatures]) };
const mockAgentRunRepo = {
  findById: vi.fn(async (id: string) => mockRuns.get(id) ?? null),
};
const mockPhaseTimingRepo = {
  findByRunId: vi.fn(async (runId: string) => mockTimings.get(runId) ?? []),
};

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn((token: string) => {
    switch (token) {
      case 'ListFeaturesUseCase':
        return mockListFeatures;
      case 'IAgentRunRepository':
        return mockAgentRunRepo;
      case 'IPhaseTimingRepository':
        return mockPhaseTimingRepo;
      default:
        throw new Error(`Unknown token: ${token}`);
    }
  }),
}));

// --- Helpers ---

function makeFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'feat-1',
    name: 'Test Feature',
    slug: 'test-feature',
    repositoryPath: '/tmp/repo',
    branch: 'main',
    lifecycle: 'Implementation' as Feature['lifecycle'],
    messages: [],
    relatedArtifacts: [],
    push: false,
    openPr: false,
    approvalGates: {} as Feature['approvalGates'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userQuery: 'test',
    ...overrides,
  } as Feature;
}

function makeRun(overrides?: Partial<AgentRun>): AgentRun {
  return {
    id: 'run-1',
    featureId: 'feat-1',
    status: AgentRunStatus.running,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as AgentRun;
}

function makeTiming(overrides?: Partial<PhaseTiming>): PhaseTiming {
  return {
    id: 'timing-1',
    agentRunId: 'run-1',
    phase: 'analyze',
    startedAt: new Date().toISOString(),
    ...overrides,
  } as PhaseTiming;
}

/**
 * Read chunks from a ReadableStream until aborted or limit reached.
 */
async function readSSEChunks(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  maxChunks = 10
): Promise<string[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  try {
    while (chunks.length < maxChunks) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value, { stream: true }));
    }
  } catch {
    // Expected when stream is cancelled
  } finally {
    reader.releaseLock();
  }

  return chunks;
}

/**
 * Wait for poll cycles by advancing time. Each poll is 3s.
 */
async function advancePollCycles(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await vi.advanceTimersByTimeAsync(3_000);
  }
}

describe('SSE API Route: GET /api/agent-events (DB polling)', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let routeModule: typeof import('@/presentation/web/app/api/agent-events/route.js');

  beforeEach(async () => {
    vi.useFakeTimers();

    // Reset mock state
    mockFeatures.length = 0;
    mockRuns.clear();
    mockTimings.clear();
    vi.clearAllMocks();

    // Fresh import each test
    routeModule = await import('@/presentation/web/app/api/agent-events/route.js');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return response with text/event-stream content type', () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');

    controller.abort();
  });

  it('should emit status change events after cache is seeded', async () => {
    const feature = makeFeature({ agentRunId: 'run-1' });
    const run = makeRun({ status: AgentRunStatus.running });

    mockFeatures.push(feature);
    mockRuns.set('run-1', run);

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    // Poll 1: seeds the cache (no events emitted)
    await advancePollCycles(1);

    // Change status for next poll
    mockRuns.set('run-1', makeRun({ status: AgentRunStatus.completed }));

    // Poll 2: detects status change → emits event
    await advancePollCycles(1);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    expect(allData).toContain('event: notification');
    expect(allData).toContain(NotificationEventType.AgentCompleted);
    expect(allData).toContain('Test Feature');
  });

  it('should not emit events on the initial seed poll', async () => {
    const feature = makeFeature({ agentRunId: 'run-1' });
    const run = makeRun({ status: AgentRunStatus.running });

    mockFeatures.push(feature);
    mockRuns.set('run-1', run);

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    // Only run one poll (seed) then abort
    await advancePollCycles(1);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    // Should have no notification events — only possibly heartbeats or nothing
    expect(allData).not.toContain('event: notification');
  });

  it('should filter events by runId when query parameter is provided', async () => {
    const feature1 = makeFeature({ id: 'feat-1', agentRunId: 'run-1', name: 'Feature One' });
    const feature2 = makeFeature({ id: 'feat-2', agentRunId: 'run-2', name: 'Feature Two' });

    mockFeatures.push(feature1, feature2);
    mockRuns.set('run-1', makeRun({ id: 'run-1', status: AgentRunStatus.running }));
    mockRuns.set('run-2', makeRun({ id: 'run-2', status: AgentRunStatus.running }));

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events?runId=run-2', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    // Seed poll
    await advancePollCycles(1);

    // Change both statuses
    mockRuns.set('run-1', makeRun({ id: 'run-1', status: AgentRunStatus.completed }));
    mockRuns.set('run-2', makeRun({ id: 'run-2', status: AgentRunStatus.completed }));

    // Delta poll
    await advancePollCycles(1);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    // Only run-2 events should appear
    expect(allData).toContain('run-2');
    expect(allData).toContain('Feature Two');
    expect(allData).not.toContain('run-1');
    expect(allData).not.toContain('Feature One');
  });

  it('should emit phase completion events for new completed phases', async () => {
    const feature = makeFeature({ agentRunId: 'run-1' });
    const run = makeRun({ status: AgentRunStatus.running });

    mockFeatures.push(feature);
    mockRuns.set('run-1', run);

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    // Seed poll (no timings yet)
    await advancePollCycles(1);

    // Add a completed phase timing for next poll
    mockTimings.set('run-1', [
      makeTiming({ phase: 'analyze', completedAt: new Date().toISOString() }),
    ]);

    // Delta poll — should detect new completed phase
    await advancePollCycles(1);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    expect(allData).toContain('event: notification');
    expect(allData).toContain(NotificationEventType.PhaseCompleted);
    expect(allData).toContain('analyze');
  });

  it('should send heartbeat comments at the configured interval', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const reader = body.getReader();
    const decoder = new TextDecoder();

    // Advance time past the heartbeat interval (30 seconds)
    await vi.advanceTimersByTimeAsync(30_000);

    const { value } = await reader.read();
    const chunk = decoder.decode(value, { stream: true });

    expect(chunk).toContain(': heartbeat');

    reader.releaseLock();
    controller.abort();
  });

  it('should clean up intervals when request is aborted', async () => {
    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const reader = body.getReader();

    // Let the stream start
    await vi.advanceTimersByTimeAsync(100);

    // Abort the request
    controller.abort();

    // Try to read to trigger cleanup
    try {
      await reader.read();
    } catch {
      // Expected
    }
    reader.releaseLock();

    // Advance time — should not throw or cause issues
    await vi.advanceTimersByTimeAsync(10_000);

    // Verify no more polls happen after abort
    const callsBefore = mockListFeatures.execute.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6_000);
    const callsAfter = mockListFeatures.execute.mock.calls.length;

    expect(callsAfter).toBe(callsBefore);
  });

  it('should support multiple concurrent SSE clients independently', async () => {
    const feature = makeFeature({ agentRunId: 'run-1' });
    const run = makeRun({ status: AgentRunStatus.running });

    mockFeatures.push(feature);
    mockRuns.set('run-1', run);

    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const request1 = new Request('http://localhost:3000/api/agent-events', {
      signal: controller1.signal,
    });
    const request2 = new Request('http://localhost:3000/api/agent-events', {
      signal: controller2.signal,
    });

    const response1 = routeModule.GET(request1);
    const response2 = routeModule.GET(request2);

    const chunks1Promise = readSSEChunks(response1.body!, controller1.signal, 5);
    const chunks2Promise = readSSEChunks(response2.body!, controller2.signal, 5);

    // Seed poll for both
    await advancePollCycles(1);

    // Change status
    mockRuns.set('run-1', makeRun({ status: AgentRunStatus.completed }));

    // Delta poll
    await advancePollCycles(1);

    controller1.abort();
    controller2.abort();

    const chunks1 = await chunks1Promise;
    const chunks2 = await chunks2Promise;

    const data1 = chunks1.join('');
    const data2 = chunks2.join('');

    // Both clients should receive the status change event
    expect(data1).toContain(NotificationEventType.AgentCompleted);
    expect(data2).toContain(NotificationEventType.AgentCompleted);
  });

  it('should gracefully handle DI container errors during poll', async () => {
    // Make resolve throw on first few polls
    mockListFeatures.execute.mockRejectedValueOnce(new Error('DI not ready'));
    mockListFeatures.execute.mockRejectedValueOnce(new Error('DI not ready'));

    const controller = new AbortController();
    const request = new Request('http://localhost:3000/api/agent-events', {
      signal: controller.signal,
    });

    const response = routeModule.GET(request);
    const body = response.body!;
    const chunksPromise = readSSEChunks(body, controller.signal, 5);

    // These polls should fail gracefully
    await advancePollCycles(2);

    // Now set up valid data
    const feature = makeFeature({ agentRunId: 'run-1' });
    mockFeatures.push(feature);
    mockRuns.set('run-1', makeRun({ status: AgentRunStatus.running }));

    // This poll should succeed (seed)
    await advancePollCycles(1);

    // Change status
    mockRuns.set('run-1', makeRun({ status: AgentRunStatus.completed }));

    // This poll should detect the change
    await advancePollCycles(1);

    controller.abort();
    const chunks = await chunksPromise;
    const allData = chunks.join('');

    // Should still get events after recovery
    expect(allData).toContain(NotificationEventType.AgentCompleted);
  });
});
