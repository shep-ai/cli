/**
 * Use Cases Bridge — Writer
 *
 * Resolves use cases from the DI container and places them on globalThis
 * so the Next.js web layer can access them without importing DI infrastructure.
 * Called by CLI bootstrap and dev-server after initializeContainer() completes.
 *
 * This file imports tsyringe and decorated use case classes — only import it
 * from Node.js entry points, never from the Next.js web layer (Turbopack
 * cannot bundle native addons or decorator metadata).
 *
 * @see use-cases-bridge.ts for the reader side (web-safe).
 */

import type { DependencyContainer } from 'tsyringe';
import { ListFeaturesUseCase } from '../../application/use-cases/features/list-features.use-case.js';
import { CreateFeatureUseCase } from '../../application/use-cases/features/create/create-feature.use-case.js';
import type { IAgentRunRepository } from '../../application/ports/output/agents/agent-run-repository.interface.js';
import { SHEP_USE_CASES_KEY } from './use-cases-bridge.js';

/**
 * Populate the globalThis bridge with resolved use cases from the DI container.
 * Must be called after `initializeContainer()` completes.
 */
export function populateUseCasesBridge(c: DependencyContainer): void {
  const bridge = {
    listFeatures: c.resolve(ListFeaturesUseCase),
    agentRunRepo: c.resolve<IAgentRunRepository>('IAgentRunRepository'),
    createFeature: c.resolve(CreateFeatureUseCase),
  };
  (globalThis as Record<string, unknown>)[SHEP_USE_CASES_KEY] = bridge;
  (process as unknown as Record<string, unknown>)[SHEP_USE_CASES_KEY] = bridge;
}
