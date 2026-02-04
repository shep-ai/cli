/**
 * Dependency Injection Container
 *
 * Configures tsyringe DI container with all application dependencies.
 * Registers repository implementations, use cases, and services.
 *
 * Usage:
 * ```typescript
 * import { container } from './infrastructure/di/container.js';
 * const useCase = container.resolve(InitializeSettingsUseCase);
 * ```
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import type Database from 'better-sqlite3';

// Repository interfaces and implementations
import type { ISettingsRepository } from '../../application/ports/output/settings.repository.interface.js';
import { SQLiteSettingsRepository } from '../repositories/sqlite-settings.repository.js';

// Use cases
import { InitializeSettingsUseCase } from '../../application/use-cases/settings/initialize-settings.use-case.js';
import { LoadSettingsUseCase } from '../../application/use-cases/settings/load-settings.use-case.js';
import { UpdateSettingsUseCase } from '../../application/use-cases/settings/update-settings.use-case.js';

// Database connection
import { getSQLiteConnection } from '../persistence/sqlite/connection.js';
import { runSQLiteMigrations } from '../persistence/sqlite/migrations.js';

/**
 * Initialize the DI container with all dependencies.
 * Must be called before resolving any dependencies.
 *
 * @returns Configured container instance
 */
export async function initializeContainer(): Promise<typeof container> {
  // Get database connection
  const db = await getSQLiteConnection();

  // Run migrations
  await runSQLiteMigrations(db);

  // Register database instance
  container.registerInstance<Database.Database>('Database', db);

  // Register repositories
  container.register<ISettingsRepository>('ISettingsRepository', {
    useFactory: (c) => {
      const database = c.resolve<Database.Database>('Database');
      return new SQLiteSettingsRepository(database);
    },
  });

  // Register use cases (singletons for performance)
  container.registerSingleton(InitializeSettingsUseCase);
  container.registerSingleton(LoadSettingsUseCase);
  container.registerSingleton(UpdateSettingsUseCase);

  return container;
}

/**
 * Get the configured container instance.
 * Container must be initialized first via initializeContainer().
 */
export { container };
