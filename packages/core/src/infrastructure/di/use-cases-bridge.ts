/**
 * Use Cases Bridge — Reader
 *
 * Lightweight reader for the globalThis DI bridge. Safe to import from
 * the Next.js web layer (no native modules, no tsyringe, no decorators).
 *
 * The writer (populate-use-cases-bridge.ts) populates globalThis after
 * DI initialization; this module reads those instances back.
 */

import type { Feature, AgentRun } from '../../domain/generated/output.js';
import type { FeatureListFilters } from '../../application/ports/output/repositories/feature-repository.interface.js';

export type { FeatureListFilters };

/** The globalThis key shared between writer and reader. */
export const SHEP_USE_CASES_KEY = '__shepUseCases';

/** Shape of the bridge object on globalThis. */
interface ShepUseCases {
  listFeatures: { execute(filters?: FeatureListFilters): Promise<Feature[]> };
  agentRunRepo: { findById(id: string): Promise<AgentRun | null> };
}

function isShepUseCases(value: unknown): value is ShepUseCases {
  if (!value || typeof value !== 'object') return false;

  const maybe = value as Record<string, unknown>;
  const listFeatures = maybe.listFeatures as Record<string, unknown> | undefined;
  const agentRunRepo = maybe.agentRunRepo as Record<string, unknown> | undefined;

  return (
    !!listFeatures &&
    typeof listFeatures.execute === 'function' &&
    !!agentRunRepo &&
    typeof agentRunRepo.findById === 'function'
  );
}

function getUseCases(): ShepUseCases | undefined {
  const globalBridge = (globalThis as Record<string, unknown>)[SHEP_USE_CASES_KEY];
  if (isShepUseCases(globalBridge)) return globalBridge;

  const processBridge = (process as unknown as Record<string, unknown>)[SHEP_USE_CASES_KEY];
  if (isShepUseCases(processBridge)) return processBridge;

  return undefined;
}

/**
 * List all features for the control center.
 * Returns an empty array if the DI bridge is not initialized
 * (e.g. during static builds or when running outside the CLI process).
 */
export async function getFeatures(filters?: FeatureListFilters): Promise<Feature[]> {
  const useCases = getUseCases();
  if (!useCases?.listFeatures) return [];

  try {
    return await useCases.listFeatures.execute(filters);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load features:', error);
    return [];
  }
}

/**
 * Find an agent run by ID.
 * Returns null if the DI bridge is not initialized or the run is not found.
 */
export async function getAgentRun(id: string): Promise<AgentRun | null> {
  const useCases = getUseCases();
  if (!useCases?.agentRunRepo) return null;

  try {
    return await useCases.agentRunRepo.findById(id);
  } catch {
    return null;
  }
}
