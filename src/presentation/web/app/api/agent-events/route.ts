/**
 * SSE API Route: GET /api/agent-events
 *
 * Streams agent lifecycle notification events to connected web UI clients
 * via Server-Sent Events (SSE).
 *
 * Uses DB polling with a per-connection cache so only deltas are sent.
 * This avoids cross-module singleton issues with an in-process event bus.
 *
 * - Polls features + agent runs every 500ms
 * - Compares against cached state and emits only changes
 * - Sends heartbeat comments every 30 seconds to keep connection alive
 * - Supports optional ?runId query parameter to filter events
 * - Cleans up intervals on client disconnect
 */

import { resolve } from '@/lib/server-container';
import type { IAgentRunRepository } from '@shepai/core/application/ports/output/agents/agent-run-repository.interface';
import type { IPhaseTimingRepository } from '@shepai/core/application/ports/output/agents/phase-timing-repository.interface';
import type { Feature, AgentRun } from '@shepai/core/domain/generated/output';
import {
  AgentRunStatus,
  SdlcLifecycle,
  NotificationEventType,
  NotificationSeverity,
} from '@shepai/core/domain/generated/output';
import type { NotificationEvent } from '@shepai/core/domain/generated/output';
import type { ListFeaturesUseCase } from '@shepai/core/application/use-cases/features/list-features.use-case';

// Force dynamic — SSE streams must never be statically optimized or cached
export const dynamic = 'force-dynamic';

const POLL_INTERVAL_MS = 500;
const HEARTBEAT_INTERVAL_MS = 30_000;

interface CachedFeatureState {
  status: AgentRunStatus | null;
  lifecycle: string;
  completedPhases: Set<string>;
  featureName: string;
}

/**
 * Maps SdlcLifecycle values to agent graph node names so the client
 * can derive the correct FeatureLifecyclePhase via mapPhaseNameToLifecycle().
 */
const LIFECYCLE_TO_NODE: Partial<Record<SdlcLifecycle, string>> = {
  [SdlcLifecycle.Analyze]: 'analyze',
  [SdlcLifecycle.Requirements]: 'requirements',
  [SdlcLifecycle.Research]: 'research',
  [SdlcLifecycle.Planning]: 'plan',
  [SdlcLifecycle.Implementation]: 'implement',
  [SdlcLifecycle.Review]: 'merge',
};

const STATUS_TO_EVENT: Partial<
  Record<AgentRunStatus, { eventType: NotificationEventType; severity: NotificationSeverity }>
> = {
  [AgentRunStatus.running]: {
    eventType: NotificationEventType.AgentStarted,
    severity: NotificationSeverity.Info,
  },
  [AgentRunStatus.waitingApproval]: {
    eventType: NotificationEventType.WaitingApproval,
    severity: NotificationSeverity.Warning,
  },
  [AgentRunStatus.completed]: {
    eventType: NotificationEventType.AgentCompleted,
    severity: NotificationSeverity.Success,
  },
  [AgentRunStatus.failed]: {
    eventType: NotificationEventType.AgentFailed,
    severity: NotificationSeverity.Error,
  },
  [AgentRunStatus.interrupted]: {
    eventType: NotificationEventType.AgentFailed,
    severity: NotificationSeverity.Warning,
  },
  [AgentRunStatus.cancelled]: {
    eventType: NotificationEventType.AgentFailed,
    severity: NotificationSeverity.Warning,
  },
};

/** Map agent graph node name from AgentRun.result to a phase name. */
function resultToPhase(result: string | undefined): string | undefined {
  if (!result?.startsWith('node:')) return undefined;
  return result.slice(5); // "node:analyze" → "analyze"
}

export function GET(request: Request): Response {
  try {
    const url = new URL(request.url);
    const runIdFilter = url.searchParams.get('runId');

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();

        // Per-connection cache: featureId → last-seen state
        const cache = new Map<string, CachedFeatureState>();
        let stopped = false;

        function enqueue(text: string) {
          if (stopped) return;
          try {
            controller.enqueue(encoder.encode(text));
          } catch {
            // Stream may be closed
          }
        }

        function emitEvent(event: NotificationEvent) {
          // eslint-disable-next-line no-console
          console.log(
            `[SSE] emit: ${event.eventType} for "${event.featureName}"${event.phaseName ? ` (${event.phaseName})` : ''}`
          );
          enqueue(`event: notification\ndata: ${JSON.stringify(event)}\n\n`);
        }

        let pollErrorCount = 0;

        async function poll() {
          if (stopped) return;

          try {
            const listFeatures = resolve<ListFeaturesUseCase>('ListFeaturesUseCase');
            const agentRunRepo = resolve<IAgentRunRepository>('IAgentRunRepository');
            const phaseTimingRepo = resolve<IPhaseTimingRepository>('IPhaseTimingRepository');

            const features = await listFeatures.execute();

            // Build current state for features with agent runs
            const entries: { feature: Feature; run: AgentRun | null }[] = await Promise.all(
              features.map(async (feature) => {
                const run = feature.agentRunId
                  ? await agentRunRepo.findById(feature.agentRunId)
                  : null;
                return { feature, run };
              })
            );

            for (const { feature, run } of entries) {
              if (!run) continue;

              // Apply runId filter if present
              if (runIdFilter && run.id !== runIdFilter) continue;

              const prev = cache.get(feature.id);

              if (!prev) {
                // First time seeing this feature — seed cache, don't emit
                const completedPhases = new Set<string>();
                try {
                  const timings = await phaseTimingRepo.findByRunId(run.id);
                  for (const t of timings) {
                    if (t.completedAt) completedPhases.add(t.phase);
                  }
                } catch {
                  // Ignore timing errors
                }

                cache.set(feature.id, {
                  status: run.status,
                  lifecycle: feature.lifecycle,
                  completedPhases,
                  featureName: feature.name,
                });
                continue;
              }

              // Check for status change
              if (prev.status !== run.status) {
                prev.status = run.status;
                const mapping = STATUS_TO_EVENT[run.status];
                if (mapping) {
                  const phase = resultToPhase(run.result);
                  emitEvent({
                    eventType: mapping.eventType,
                    agentRunId: run.id,
                    featureId: feature.id,
                    featureName: feature.name,
                    ...(phase && { phaseName: phase }),
                    message: `Agent status: ${run.status}`,
                    severity: mapping.severity,
                    timestamp: new Date().toISOString(),
                  });
                }
              }

              // Check for lifecycle change (agent stays "running" but moves through phases)
              if (prev.lifecycle !== feature.lifecycle) {
                prev.lifecycle = feature.lifecycle;
                const nodeName = LIFECYCLE_TO_NODE[feature.lifecycle as SdlcLifecycle];
                if (nodeName) {
                  emitEvent({
                    eventType: NotificationEventType.PhaseCompleted,
                    agentRunId: run.id,
                    featureId: feature.id,
                    featureName: feature.name,
                    phaseName: nodeName,
                    message: `Entered ${nodeName} phase`,
                    severity: NotificationSeverity.Info,
                    timestamp: new Date().toISOString(),
                  });
                }
              }

              // Check for new phase completions
              try {
                const timings = await phaseTimingRepo.findByRunId(run.id);
                for (const t of timings) {
                  if (t.completedAt && !prev.completedPhases.has(t.phase)) {
                    prev.completedPhases.add(t.phase);
                    emitEvent({
                      eventType: NotificationEventType.PhaseCompleted,
                      agentRunId: run.id,
                      featureId: feature.id,
                      featureName: feature.name,
                      phaseName: t.phase,
                      message: `Completed ${t.phase} phase`,
                      severity: NotificationSeverity.Info,
                      timestamp: new Date().toISOString(),
                    });
                  }
                }
              } catch {
                // Ignore timing errors
              }
            }
            pollErrorCount = 0; // Reset on success
          } catch (error) {
            pollErrorCount++;
            // Log first few errors, then throttle to avoid spamming
            if (pollErrorCount <= 3 || pollErrorCount % 60 === 0) {
              // eslint-disable-next-line no-console
              console.error(
                `[SSE /api/agent-events] poll error #${pollErrorCount}:`,
                error instanceof Error ? error.message : error
              );
            }
          }
        }

        // First poll immediately, then every POLL_INTERVAL_MS
        void poll();
        const pollInterval = setInterval(() => void poll(), POLL_INTERVAL_MS);

        // Heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          enqueue(': heartbeat\n\n');
        }, HEARTBEAT_INTERVAL_MS);

        // Cleanup on client disconnect
        const cleanup = () => {
          stopped = true;
          clearInterval(pollInterval);
          clearInterval(heartbeatInterval);
          try {
            controller.close();
          } catch {
            // Stream may already be closed
          }
        };

        request.signal.addEventListener('abort', cleanup, { once: true });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[SSE route] GET handler error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
