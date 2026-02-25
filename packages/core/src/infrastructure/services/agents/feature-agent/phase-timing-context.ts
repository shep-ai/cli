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
let lastTimingId: string | null = null;

/**
 * Get the last phase timing ID. Used by the worker to record approval wait start.
 */
export function getLastTimingId(): string | null {
  return lastTimingId;
}

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
  lastTimingId = null;
}

/**
 * Compute the iteration-aware phase name.
 *
 * Queries existing PhaseTiming rows for the current run, counts how many
 * share the same base phase name, and appends `:N` for iterations > 1.
 *
 * Examples:
 *   - First "requirements" execution  → "requirements"
 *   - Second "requirements" execution → "requirements:2"
 *   - Third "requirements" execution  → "requirements:3"
 */
async function resolveIterationPhase(
  phase: string,
  runId: string,
  repository: IPhaseTimingRepository
): Promise<string> {
  try {
    const existing = await repository.findByRunId(runId);
    // Count rows whose phase is the base name or matches the base:N pattern
    const count = existing.filter(
      (t) => t.phase === phase || t.phase.startsWith(`${phase}:`)
    ).length;
    return count === 0 ? phase : `${phase}:${count + 1}`;
  } catch {
    // On error, fall back to bare phase name
    return phase;
  }
}

/**
 * Record the start of a phase. Returns the timing record ID (for later update)
 * or null if context is not set or save fails.
 *
 * Automatically appends an iteration suffix (`:2`, `:3`, …) when the same
 * phase has already been recorded for this run (e.g. after a rejection loop).
 */
export async function recordPhaseStart(phase: string): Promise<string | null> {
  if (!contextRunId || !contextRepository) return null;

  const id = randomUUID();
  const now = new Date();

  try {
    const iterationPhase = await resolveIterationPhase(phase, contextRunId, contextRepository);
    await contextRepository.save({
      id,
      agentRunId: contextRunId,
      phase: iterationPhase,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    lastTimingId = id;
    return id;
  } catch {
    lastTimingId = null;
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

/**
 * Record an instant lifecycle event (e.g., run:started, run:stopped, run:crashed).
 * These are phase timing records with zero duration, used to mark events in the timeline.
 *
 * Can be called with explicit runId and repository (for use outside the worker context,
 * e.g., from use cases like StopAgentRunUseCase or ResumeFeatureUseCase).
 */
export async function recordLifecycleEvent(
  phase: string,
  explicitRunId?: string,
  explicitRepo?: IPhaseTimingRepository
): Promise<void> {
  const runId = explicitRunId ?? contextRunId;
  const repo = explicitRepo ?? contextRepository;
  if (!runId || !repo) return;

  const now = new Date();
  try {
    await repo.save({
      id: randomUUID(),
      agentRunId: runId,
      phase,
      startedAt: now,
      completedAt: now,
      durationMs: BigInt(0),
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    // Swallow — lifecycle event recording is non-fatal
  }
}

/**
 * Record the start of an approval wait. Sets waitingApprovalAt on the timing record.
 * No-op if timingId is null or context is not set.
 */
export async function recordApprovalWaitStart(timingId: string | null): Promise<void> {
  if (!timingId || !contextRepository) return;

  try {
    await contextRepository.updateApprovalWait(timingId, {
      waitingApprovalAt: new Date(),
    });
  } catch {
    // Swallow — approval wait timing failure is non-fatal
  }
}
