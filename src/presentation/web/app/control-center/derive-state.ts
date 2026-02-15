import type { FeatureNodeState } from '@/components/common/feature-node';

/**
 * Derives the UI feature node state from lifecycle phase and agent run status.
 * - 'maintain' lifecycle always returns done (completed feature)
 * - Agent status maps: completed->done, failed->error, waiting_approval->action-required
 * - Default: running with 0 progress
 */
export function deriveState(
  lifecycle: string,
  agentStatus: string | undefined
): { state: FeatureNodeState; progress: number } {
  if (lifecycle === 'maintain') {
    return { state: 'done', progress: 100 };
  }

  switch (agentStatus) {
    case 'completed':
      return { state: 'done', progress: 100 };
    case 'failed':
      return { state: 'error', progress: 0 };
    case 'waiting_approval':
      return { state: 'action-required', progress: 0 };
    default:
      return { state: 'running', progress: 0 };
  }
}
