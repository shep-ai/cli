/**
 * Lifecycle Context
 *
 * Module-level singleton that allows graph nodes to update the feature's
 * SDLC lifecycle as they execute, following the same pattern as
 * phase-timing-context.ts.
 *
 * The worker calls setLifecycleContext() once after DI init.
 * Nodes call updateNodeLifecycle() at the start of execution.
 * Errors are swallowed so lifecycle updates never block graph execution.
 */

import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import { SdlcLifecycle } from '@/domain/generated/output.js';

let contextFeatureId: string | undefined;
let contextRepository: IFeatureRepository | undefined;

/** Map graph node names to their corresponding SDLC lifecycle stage. */
const NODE_TO_LIFECYCLE: Record<string, SdlcLifecycle> = {
  analyze: SdlcLifecycle.Analyze,
  requirements: SdlcLifecycle.Requirements,
  research: SdlcLifecycle.Research,
  plan: SdlcLifecycle.Planning,
  implement: SdlcLifecycle.Implementation,
  merge: SdlcLifecycle.Review,
};

/**
 * Set the lifecycle context. Called once by the worker after DI init.
 */
export function setLifecycleContext(featureId: string, repository: IFeatureRepository): void {
  contextFeatureId = featureId;
  contextRepository = repository;
}

/**
 * Clear the lifecycle context. Useful for testing.
 */
export function clearLifecycleContext(): void {
  contextFeatureId = undefined;
  contextRepository = undefined;
}

/**
 * Update the feature's lifecycle to match the current graph node.
 * No-op if context is not set or the node name has no lifecycle mapping.
 */
export async function updateNodeLifecycle(nodeName: string): Promise<void> {
  if (!contextFeatureId || !contextRepository) return;

  const lifecycle = NODE_TO_LIFECYCLE[nodeName];
  if (!lifecycle) return;

  try {
    const feature = await contextRepository.findById(contextFeatureId);
    if (!feature) return;

    await contextRepository.update({
      ...feature,
      lifecycle,
      updatedAt: new Date(),
    });
  } catch {
    // Swallow — lifecycle update failure is non-fatal
  }
}
