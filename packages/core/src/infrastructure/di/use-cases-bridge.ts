/**
 * Use Cases Bridge — Reader
 *
 * Why does this exist?
 * Use cases (e.g. ListFeaturesUseCase) are DI-managed classes that depend on
 * injected repositories, which in turn need a live SQLite connection. The web
 * layer (Next.js / Turbopack) cannot run the DI container because it would
 * pull in tsyringe, reflect-metadata, and better-sqlite3 (native C++ addon) —
 * none of which Turbopack can bundle.
 *
 * How it works:
 * 1. CLI bootstrap runs initializeContainer() and resolves fully-wired use cases.
 * 2. The writer (populate-use-cases-bridge.ts) places those instances on globalThis.
 * 3. This reader retrieves them — no DI, no native modules, no decorators.
 *
 * This file is safe to import from the Next.js web layer.
 */

import type { Feature, AgentRun } from '../../domain/generated/output.js';
import type { FeatureListFilters } from '../../application/ports/output/repositories/feature-repository.interface.js';
import type {
  CreateFeatureInput,
  CreateFeatureResult,
} from '../../application/use-cases/features/create/types.js';

export type { FeatureListFilters, CreateFeatureInput, CreateFeatureResult };

/** The globalThis key shared between writer and reader. */
export const SHEP_USE_CASES_KEY = '__shepUseCases';

/** Shape of the bridge object on globalThis. */
interface ShepUseCases {
  listFeatures: { execute(filters?: FeatureListFilters): Promise<Feature[]> };
  agentRunRepo: { findById(id: string): Promise<AgentRun | null> };
  createFeature: { execute(input: CreateFeatureInput): Promise<CreateFeatureResult> };
}

function isShepUseCases(value: unknown): value is ShepUseCases {
  if (!value || typeof value !== 'object') return false;

  const maybe = value as Record<string, unknown>;
  const listFeatures = maybe.listFeatures as Record<string, unknown> | undefined;
  const agentRunRepo = maybe.agentRunRepo as Record<string, unknown> | undefined;
  const createFeature = maybe.createFeature as Record<string, unknown> | undefined;

  return (
    !!listFeatures &&
    typeof listFeatures.execute === 'function' &&
    !!agentRunRepo &&
    typeof agentRunRepo.findById === 'function' &&
    !!createFeature &&
    typeof createFeature.execute === 'function'
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

/**
 * Create a new feature via the DI-managed use case.
 * Unlike getFeatures/getAgentRun, this function propagates errors so callers
 * (API routes) can return proper HTTP error responses and surface messages to the user.
 * Throws if the bridge is not initialized or the use case fails.
 */
export async function createFeature(input: CreateFeatureInput): Promise<CreateFeatureResult> {
  const useCases = getUseCases();
  if (!useCases?.createFeature) {
    throw new Error('Use-cases bridge is not initialized. Ensure the CLI process is running.');
  }

  return useCases.createFeature.execute(input);
}
