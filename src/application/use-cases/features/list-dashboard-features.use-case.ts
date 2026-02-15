/**
 * List Dashboard Features Use Case
 *
 * Retrieves features with joined agent run data for dashboard display.
 * Uses listWithAgentRuns() which performs a LEFT JOIN with agent_runs.
 *
 * Business Rules:
 * - Returns all features with agent metadata when no filters are provided
 * - Filters are passed through to the repository
 */

import { injectable, inject } from 'tsyringe';
import type {
  IFeatureRepository,
  FeatureListFilters,
  DashboardFeature,
} from '../../ports/output/repositories/feature-repository.interface.js';

@injectable()
export class ListDashboardFeaturesUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository
  ) {}

  async execute(filters?: FeatureListFilters): Promise<DashboardFeature[]> {
    return this.featureRepo.listWithAgentRuns(filters);
  }
}
