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

// Validator interfaces and implementations
import type { IAgentValidator } from '../../application/ports/output/agent-validator.interface.js';
import { AgentValidatorService } from '../services/agents/agent-validator.service.js';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

// Service interfaces and implementations
import type { IVersionService } from '../../application/ports/output/version-service.interface.js';
import { VersionService } from '../services/version.service.js';
import type { IWebServerService } from '../../application/ports/output/web-server-service.interface.js';
import { WebServerService } from '../services/web-server.service.js';

// Agent infrastructure interfaces and implementations
import type { IAgentExecutorFactory } from '../../application/ports/output/agent-executor-factory.interface.js';
import type { IAgentRegistry } from '../../application/ports/output/agent-registry.interface.js';
import type { IAgentRunner } from '../../application/ports/output/agent-runner.interface.js';
import type { IAgentRunRepository } from '../../application/ports/output/agent-run-repository.interface.js';
import { AgentExecutorFactory } from '../services/agents/agent-executor-factory.service.js';
import { AgentRegistryService } from '../services/agents/agent-registry.service.js';
import { AgentRunnerService } from '../services/agents/agent-runner.service.js';
import { SQLiteAgentRunRepository } from '../repositories/agent-run.repository.js';
import { createCheckpointer } from '../services/agents/langgraph/checkpointer.js';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import { spawn } from 'node:child_process';

// Use cases
import { InitializeSettingsUseCase } from '../../application/use-cases/settings/initialize-settings.use-case.js';
import { LoadSettingsUseCase } from '../../application/use-cases/settings/load-settings.use-case.js';
import { UpdateSettingsUseCase } from '../../application/use-cases/settings/update-settings.use-case.js';
import { ConfigureAgentUseCase } from '../../application/use-cases/agents/configure-agent.use-case.js';
import { ValidateAgentAuthUseCase } from '../../application/use-cases/agents/validate-agent-auth.use-case.js';
import { RunAgentUseCase } from '../../application/use-cases/agents/run-agent.use-case.js';

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

  // Register external dependencies as tokens
  const execFileAsync = promisify(execFile);
  container.registerInstance('ExecFunction', execFileAsync);

  // Register services (singletons via @injectable + token)
  container.registerSingleton<IAgentValidator>('IAgentValidator', AgentValidatorService);
  container.registerSingleton<IVersionService>('IVersionService', VersionService);
  container.register<IWebServerService>('IWebServerService', {
    useFactory: () => new WebServerService(),
  });

  // Register agent infrastructure
  container.register<IAgentRunRepository>('IAgentRunRepository', {
    useFactory: (c) => {
      const database = c.resolve<Database.Database>('Database');
      return new SQLiteAgentRunRepository(database);
    },
  });

  container.register<IAgentExecutorFactory>('IAgentExecutorFactory', {
    useFactory: () => new AgentExecutorFactory(spawn),
  });

  container.register<IAgentRegistry>('IAgentRegistry', {
    useFactory: () => new AgentRegistryService(),
  });

  container.register('Checkpointer', {
    useFactory: () => createCheckpointer(':memory:'),
  });

  container.register<IAgentRunner>('IAgentRunner', {
    useFactory: (c) => {
      const registry = c.resolve<IAgentRegistry>('IAgentRegistry');
      const executorFactory = c.resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
      const checkpointer = c.resolve('Checkpointer') as BaseCheckpointSaver;
      const runRepository = c.resolve<IAgentRunRepository>('IAgentRunRepository');
      return new AgentRunnerService(registry, executorFactory, checkpointer, runRepository);
    },
  });

  // Register use cases (singletons for performance)
  container.registerSingleton(InitializeSettingsUseCase);
  container.registerSingleton(LoadSettingsUseCase);
  container.registerSingleton(UpdateSettingsUseCase);
  container.registerSingleton(ConfigureAgentUseCase);
  container.registerSingleton(ValidateAgentAuthUseCase);
  container.registerSingleton(RunAgentUseCase);

  return container;
}

/**
 * Get the configured container instance.
 * Container must be initialized first via initializeContainer().
 */
export { container };
