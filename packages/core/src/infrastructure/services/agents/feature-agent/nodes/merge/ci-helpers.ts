/**
 * CI Helper Utilities
 *
 * Shared helpers for the CI watch/fix loop and merge node:
 * - extractRunId: parse GitHub Actions run ID from URL
 * - handleCiTerminalFailure: update feature repo on CI failure
 * - buildCiExhaustedError: structured error for exhausted/timed-out loops
 */

import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import { PrStatus, CiStatus, type CiFixRecord } from '@/domain/generated/output.js';

/**
 * Extract the numeric GitHub Actions run ID from a run URL.
 * Example: https://github.com/org/repo/actions/runs/12345 → "12345"
 */
export function extractRunId(runUrl: string): string | undefined {
  const match = runUrl.match(/\/runs\/(\d+)/);
  return match ? match[1] : undefined;
}

/**
 * Update the feature repository to mark CI as failed before throwing.
 */
export async function handleCiTerminalFailure(
  feature: Awaited<ReturnType<Pick<IFeatureRepository, 'findById'>['findById']>>,
  prUrl: string | null,
  prNumber: number | null,
  featureRepository: Pick<IFeatureRepository, 'findById' | 'update'>,
  messages: string[]
): Promise<void> {
  if (feature && prUrl && prNumber) {
    await featureRepository.update({
      ...feature,
      lifecycle: feature.lifecycle,
      pr: {
        url: prUrl,
        number: prNumber,
        status: PrStatus.Open,
        ciStatus: CiStatus.Failure,
      },
      updatedAt: new Date(),
    });
  }
  messages.push(`[merge] CI watch/fix loop failed — feature halted`);
}

/**
 * Build a structured error message describing the CI fix loop outcome.
 */
export function buildCiExhaustedError(
  attempts: number,
  history: CiFixRecord[],
  reason: 'exhausted' | 'timeout'
): Error {
  const reasonStr =
    reason === 'timeout' ? 'CI watch timed out' : `all ${attempts} fix attempt(s) exhausted`;
  const historyStr = history
    .map((r) => `  - Attempt ${r.attempt}: ${r.outcome} (started ${r.startedAt})`)
    .join('\n');
  const detail = historyStr ? `\nAttempt history:\n${historyStr}` : '';
  return new Error(
    `CI watch/fix loop failed — ${reasonStr}.${detail}\nReview CI logs and fix manually.`
  );
}
