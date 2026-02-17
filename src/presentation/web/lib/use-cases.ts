/**
 * Global DI Bridge — Web Layer Use Case Access
 *
 * Reads resolved use cases from globalThis.__shepUseCases, which is populated
 * by the CLI bootstrap after DI container initialization. This avoids importing
 * CLI source files directly (Turbopack cannot resolve Node.js ESM .js imports).
 *
 * All TypeScript interfaces are defined locally to avoid cross-package imports.
 * Server-side only (used in server components).
 */

import type { Feature, AgentRun } from '@shepai/core/domain/generated';
import { SHEP_USE_CASES_KEY } from '@shepai/core/infrastructure/di/use-cases-bridge';

/** Filters for listing features. */
interface FeatureListFilters {
  repositoryPath?: string;
  lifecycle?: string;
}

/** Shape of the use case exposed via globalThis. */
interface ListFeaturesUseCase {
  execute(filters?: FeatureListFilters): Promise<Feature[]>;
}

/** Minimal repository shape for agent run lookups. */
interface AgentRunRepository {
  findById(id: string): Promise<AgentRun | null>;
}

/** Shape of the globalThis.__shepUseCases bridge object. */
interface ShepUseCases {
  listFeatures: ListFeaturesUseCase;
  agentRunRepo: AgentRunRepository;
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
  if (isShepUseCases(globalBridge)) {
    return globalBridge;
  }

  const processBridge = (process as unknown as Record<string, unknown>)[SHEP_USE_CASES_KEY];
  if (isShepUseCases(processBridge)) {
    return processBridge;
  }

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
