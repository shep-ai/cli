/**
 * Feature State Derivation
 *
 * Derives UI node state and progress from the Feature domain model
 * and its associated AgentRun status (mirrors CLI feat ls logic).
 */

import {
  SdlcLifecycle,
  AgentRunStatus,
  TaskState,
  NotificationEventType,
} from '@shepai/core/domain/generated';
import type { Feature, AgentRun } from '@shepai/core/domain/generated';
import type { FeatureNodeState, FeatureLifecyclePhase } from './feature-node-state-config';

/**
 * Derives the visual node state from a Feature and its optional AgentRun.
 *
 * Priority (mirrors CLI formatStatus):
 * 1. Agent waiting_approval → action-required
 * 2. Agent failed → error
 * 3. Agent interrupted/cancelled → blocked
 * 4. Agent completed + Maintain lifecycle → done
 * 5. Agent running/pending → running
 * 6. No agent run → fall back to plan tasks / lifecycle
 */
export function deriveNodeState(feature: Feature, agentRun?: AgentRun | null): FeatureNodeState {
  // Blocked lifecycle takes priority — child waiting on parent regardless of agent run
  if (feature.lifecycle === SdlcLifecycle.Blocked) {
    return 'blocked';
  }

  if (agentRun) {
    switch (agentRun.status) {
      case AgentRunStatus.waitingApproval:
        return 'action-required';
      case AgentRunStatus.failed:
        return 'error';
      case AgentRunStatus.interrupted:
      case AgentRunStatus.cancelled:
        return 'blocked';
      case AgentRunStatus.completed:
        return feature.lifecycle === SdlcLifecycle.Maintain ? 'done' : 'done';
      case AgentRunStatus.running:
      case AgentRunStatus.pending:
        return 'running';
    }
  }

  // No agent run — fall back to plan tasks
  if (feature.lifecycle === SdlcLifecycle.Maintain) {
    return 'done';
  }

  const tasks = feature.plan?.tasks;
  if (!tasks || tasks.length === 0) {
    return 'running';
  }

  if (tasks.some((t) => t.state === TaskState.Review)) {
    return 'action-required';
  }
  if (tasks.some((t) => t.state === TaskState.WIP)) {
    return 'running';
  }
  if (tasks.every((t) => t.state === TaskState.Done)) {
    return 'done';
  }

  return 'running';
}

/**
 * Derives progress percentage from Feature.plan.tasks.
 *
 * Returns the percentage of tasks in Done state.
 * Returns 100 for Maintain lifecycle, 0 if no plan.
 */
export function deriveProgress(feature: Feature): number {
  if (feature.lifecycle === SdlcLifecycle.Maintain) {
    return 100;
  }

  const tasks = feature.plan?.tasks;
  if (!tasks || tasks.length === 0) {
    return 0;
  }

  const doneCount = tasks.filter((t) => t.state === TaskState.Done).length;
  return Math.round((doneCount / tasks.length) * 100);
}

/** Maps a NotificationEventType to the corresponding FeatureNodeState for optimistic UI updates. */
export function mapEventTypeToState(eventType: NotificationEventType): FeatureNodeState {
  switch (eventType) {
    case NotificationEventType.AgentStarted:
    case NotificationEventType.PhaseCompleted:
      return 'running';
    case NotificationEventType.WaitingApproval:
      return 'action-required';
    case NotificationEventType.AgentCompleted:
      return 'done';
    case NotificationEventType.AgentFailed:
      return 'error';
  }
}

/** Maps an SSE event phaseName to a FeatureLifecyclePhase. Mirrors page.tsx nodeToLifecyclePhase. */
const phaseNameToLifecycle: Record<string, FeatureLifecyclePhase> = {
  analyze: 'requirements',
  requirements: 'requirements',
  research: 'research',
  plan: 'implementation',
  implement: 'implementation',
  merge: 'review',
};

export function mapPhaseNameToLifecycle(
  phaseName: string | undefined
): FeatureLifecyclePhase | undefined {
  if (!phaseName) return undefined;
  return phaseNameToLifecycle[phaseName];
}
