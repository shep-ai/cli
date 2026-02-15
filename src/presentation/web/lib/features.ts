/**
 * Feature Data Access
 *
 * Provides feature data to the web UI via the application layer's
 * ListFeaturesUseCase, following Clean Architecture.
 *
 * Manually instantiates the use case with the repository since the
 * web package doesn't share the CLI's tsyringe DI container.
 */

import type { Feature } from '@cli/domain/generated/output.js';
import type { FeatureListFilters } from '@cli/application/ports/output/repositories/feature-repository.interface.js';
import { SQLiteFeatureRepository } from '@cli/infrastructure/repositories/sqlite-feature.repository.js';
import { getSQLiteConnection } from '@cli/infrastructure/persistence/sqlite/connection.js';
import { runSQLiteMigrations } from '@cli/infrastructure/persistence/sqlite/migrations.js';
import { ListFeaturesUseCase } from '@cli/application/use-cases/features/list-features.use-case.js';

export type { Feature };

let useCaseInstance: ListFeaturesUseCase | null = null;

async function getUseCase(): Promise<ListFeaturesUseCase> {
  if (useCaseInstance) return useCaseInstance;

  const db = await getSQLiteConnection();
  await runSQLiteMigrations(db);
  const repo = new SQLiteFeatureRepository(db);
  useCaseInstance = new ListFeaturesUseCase(repo);
  return useCaseInstance;
}

/**
 * List features using the application layer use case.
 * Server-side only — reads from the shared ~/.shep/data SQLite database.
 */
export async function getFeatures(filters?: FeatureListFilters): Promise<Feature[]> {
  try {
    const useCase = await getUseCase();
    return await useCase.execute(filters);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load features:', error);
    return [];
  }
}
