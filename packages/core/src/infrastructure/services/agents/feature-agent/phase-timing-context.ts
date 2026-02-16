/**
 * Phase Timing Context
 *
 * Module-level singleton that provides phase timing recording
 * to executeNode() without changing its public API.
 *
 * The worker calls setPhaseTimingContext() once after DI init.
 * Node helpers call recordPhaseStart/End() during graph execution.
 * Errors are swallowed so timing never blocks graph execution.
 */

import { randomUUID } from 'node:crypto';
import type { IPhaseTimingRepository } from '@/application/ports/output/agents/phase-timing-repository.interface.js';

let contextRunId: string | undefined;
let contextRepository: IPhaseTimingRepository | undefined;

/**
 * Set the phase timing context. Called once by the worker after DI init.
 */
export function setPhaseTimingContext(runId: string, repository: IPhaseTimingRepository): void {
  contextRunId = runId;
  contextRepository = repository;
}

/**
 * Clear the phase timing context. Useful for testing.
 */
export function clearPhaseTimingContext(): void {
  contextRunId = undefined;
  contextRepository = undefined;
}

/**
 * Record the start of a phase. Returns the timing record ID (for later update)
 * or null if context is not set or save fails.
 */
export async function recordPhaseStart(phase: string): Promise<string | null> {
  if (!contextRunId || !contextRepository) return null;

  const id = randomUUID();
  const now = new Date();

  try {
    await contextRepository.save({
      id,
      agentRunId: contextRunId,
      phase,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  } catch {
    return null;
  }
}

/**
 * Record the end of a phase. Updates the timing record with completedAt and durationMs.
 * No-op if timingId is null (phase start was skipped or failed).
 */
export async function recordPhaseEnd(timingId: string | null, durationMs: number): Promise<void> {
  if (!timingId || !contextRepository) return;

  try {
    await contextRepository.update(timingId, {
      completedAt: new Date(),
      durationMs: BigInt(durationMs),
    });
  } catch {
    // Swallow — timing update failure is non-fatal
  }
}
