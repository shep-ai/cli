/**
 * Use Cases Bridge — globalThis DI Bridge for the Web Layer
 *
 * Populates globalThis with resolved use case instances so the Next.js
 * web layer can access them without importing CLI source files directly
 * (Turbopack cannot resolve Node.js ESM .js imports).
 *
 * Writer: called by CLI bootstrap and dev-server after DI initialization.
 * Reader: called by web server components via use-cases.ts.
 */

import type { DependencyContainer } from 'tsyringe';
import { ListFeaturesUseCase } from '../../application/use-cases/features/list-features.use-case.js';
import type { IAgentRunRepository } from '../../application/ports/output/agents/agent-run-repository.interface.js';

/** The globalThis key shared between writer and reader. */
export const SHEP_USE_CASES_KEY = '__shepUseCases';

/**
 * Populate the globalThis bridge with resolved use cases from the DI container.
 * Must be called after `initializeContainer()` completes.
 */
export function populateUseCasesBridge(c: DependencyContainer): void {
  const bridge = {
    listFeatures: c.resolve(ListFeaturesUseCase),
    agentRunRepo: c.resolve<IAgentRunRepository>('IAgentRunRepository'),
  };
  (globalThis as Record<string, unknown>)[SHEP_USE_CASES_KEY] = bridge;
  (process as unknown as Record<string, unknown>)[SHEP_USE_CASES_KEY] = bridge;
}
