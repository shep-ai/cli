/**
 * Feature State Derivation
 *
 * Derives UI node state and progress from the Feature domain model.
 * State is computed from Feature.lifecycle and Feature.plan.tasks.
 */

import { SdlcLifecycle, TaskState } from '@shepai/core/domain/generated';
import type { Feature } from '@shepai/core/domain/generated';
import type { FeatureNodeState } from './feature-node-state-config';

/**
 * Derives the visual node state from a Feature domain entity.
 *
 * Priority:
 * 1. Maintain lifecycle → done
 * 2. Plan tasks with Review state → action-required
 * 3. Plan tasks with WIP state → running
 * 4. All tasks Done → done
 * 5. No plan → running (feature is being set up)
 */
export function deriveNodeState(feature: Feature): FeatureNodeState {
  if (feature.lifecycle === SdlcLifecycle.Maintain) {
    return 'done';
  }

  const tasks = feature.plan?.tasks;
  if (!tasks || tasks.length === 0) {
    return 'running';
  }

  const hasReview = tasks.some((t) => t.state === TaskState.Review);
  if (hasReview) {
    return 'action-required';
  }

  const hasWip = tasks.some((t) => t.state === TaskState.WIP);
  if (hasWip) {
    return 'running';
  }

  const allDone = tasks.every((t) => t.state === TaskState.Done);
  if (allDone) {
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
