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

/** Feature with joined agent run data for dashboard display. */
export interface DashboardFeature {
  id: string;
  name: string;
  slug: string;
  description: string;
  repositoryPath: string;
  branch: string;
  lifecycle: string;
  specPath?: string;
  agentStatus?: string;
  agentError?: string;
  agentResult?: string;
  agentType?: string;
}

/** Filters for listing features. */
interface FeatureListFilters {
  repositoryPath?: string;
  lifecycle?: string;
}

/** Shape of the use case exposed via globalThis. */
interface ListDashboardFeaturesUseCase {
  execute(filters?: FeatureListFilters): Promise<DashboardFeature[]>;
}

/** Shape of the globalThis.__shepUseCases bridge object. */
interface ShepUseCases {
  listDashboardFeatures: ListDashboardFeaturesUseCase;
}

function getUseCases(): ShepUseCases | undefined {
  return (globalThis as Record<string, unknown>).__shepUseCases as ShepUseCases | undefined;
}

/**
 * List all features with agent run data for the dashboard.
 * Returns an empty array if the DI bridge is not initialized
 * (e.g. during static builds or when running outside the CLI process).
 */
export async function getDashboardFeatures(
  filters?: FeatureListFilters
): Promise<DashboardFeature[]> {
  const useCases = getUseCases();
  if (!useCases?.listDashboardFeatures) return [];

  try {
    return await useCases.listDashboardFeatures.execute(filters);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load dashboard features:', error);
    return [];
  }
}
