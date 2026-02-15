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
import type { ISettingsRepository } from '../../application/ports/output/repositories/settings.repository.interface.js';
import { SQLiteSettingsRepository } from '../repositories/sqlite-settings.repository.js';
import type { IFeatureRepository } from '../../application/ports/output/repositories/feature-repository.interface.js';
import { SQLiteFeatureRepository } from '../repositories/sqlite-feature.repository.js';

// Validator interfaces and implementations
import type { IAgentValidator } from '../../application/ports/output/agents/agent-validator.interface.js';
import { AgentValidatorService } from '../services/agents/common/agent-validator.service.js';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

// Service interfaces and implementations
import type { IVersionService } from '../../application/ports/output/services/version-service.interface.js';
import { VersionService } from '../services/version.service.js';
import type { IWebServerService } from '../../application/ports/output/services/web-server-service.interface.js';
import { WebServerService } from '../services/web-server.service.js';
import type { IWorktreeService } from '../../application/ports/output/services/worktree-service.interface.js';
import { WorktreeService } from '../services/git/worktree.service.js';

// Agent infrastructure interfaces and implementations
import type { IAgentExecutorFactory } from '../../application/ports/output/agents/agent-executor-factory.interface.js';
import type { IAgentExecutorProvider } from '../../application/ports/output/agents/agent-executor-provider.interface.js';
import type { IAgentRegistry } from '../../application/ports/output/agents/agent-registry.interface.js';
import type { IAgentRunner } from '../../application/ports/output/agents/agent-runner.interface.js';
import type { IAgentRunRepository } from '../../application/ports/output/agents/agent-run-repository.interface.js';
import type { IFeatureAgentProcessService } from '../../application/ports/output/agents/feature-agent-process.interface.js';
import type { ISpecInitializerService } from '../../application/ports/output/services/spec-initializer.interface.js';
import { AgentExecutorFactory } from '../services/agents/common/agent-executor-factory.service.js';
import { AgentExecutorProvider } from '../services/agents/common/agent-executor-provider.service.js';
import { MockAgentExecutorFactory } from '../services/agents/common/executors/mock-executor-factory.service.js';
import { AgentRegistryService } from '../services/agents/common/agent-registry.service.js';
import { AgentRunnerService } from '../services/agents/common/agent-runner.service.js';
import { SQLiteAgentRunRepository } from '../repositories/agent-run.repository.js';
import { FeatureAgentProcessService } from '../services/agents/feature-agent/feature-agent-process.service.js';
import { SpecInitializerService } from '../services/spec/spec-initializer.service.js';
import { createCheckpointer } from '../services/agents/common/checkpointer.js';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import { spawn } from 'node:child_process';

// Use cases
import { InitializeSettingsUseCase } from '../../application/use-cases/settings/initialize-settings.use-case.js';
import { LoadSettingsUseCase } from '../../application/use-cases/settings/load-settings.use-case.js';
import { UpdateSettingsUseCase } from '../../application/use-cases/settings/update-settings.use-case.js';
import { ConfigureAgentUseCase } from '../../application/use-cases/agents/configure-agent.use-case.js';
import { ValidateAgentAuthUseCase } from '../../application/use-cases/agents/validate-agent-auth.use-case.js';
import { RunAgentUseCase } from '../../application/use-cases/agents/run-agent.use-case.js';
import { GetAgentRunUseCase } from '../../application/use-cases/agents/get-agent-run.use-case.js';
import { ListAgentRunsUseCase } from '../../application/use-cases/agents/list-agent-runs.use-case.js';
import { StopAgentRunUseCase } from '../../application/use-cases/agents/stop-agent-run.use-case.js';
import { DeleteAgentRunUseCase } from '../../application/use-cases/agents/delete-agent-run.use-case.js';
import { ApproveAgentRunUseCase } from '../../application/use-cases/agents/approve-agent-run.use-case.js';
import { RejectAgentRunUseCase } from '../../application/use-cases/agents/reject-agent-run.use-case.js';
import { CreateFeatureUseCase } from '../../application/use-cases/features/create-feature.use-case.js';
import { ListFeaturesUseCase } from '../../application/use-cases/features/list-features.use-case.js';
import { ShowFeatureUseCase } from '../../application/use-cases/features/show-feature.use-case.js';
import { DeleteFeatureUseCase } from '../../application/use-cases/features/delete-feature.use-case.js';
import { ResumeFeatureUseCase } from '../../application/use-cases/features/resume-feature.use-case.js';

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

  container.register<IFeatureRepository>('IFeatureRepository', {
    useFactory: (c) => {
      const database = c.resolve<Database.Database>('Database');
      return new SQLiteFeatureRepository(database);
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
  container.registerSingleton<IWorktreeService>('IWorktreeService', WorktreeService);

  // Register agent infrastructure
  container.register<IAgentRunRepository>('IAgentRunRepository', {
    useFactory: (c) => {
      const database = c.resolve<Database.Database>('Database');
      return new SQLiteAgentRunRepository(database);
    },
  });

  if (process.env.SHEP_MOCK_EXECUTOR === '1') {
    container.register<IAgentExecutorFactory>('IAgentExecutorFactory', {
      useFactory: () => new MockAgentExecutorFactory(),
    });
  } else {
    container.register<IAgentExecutorFactory>('IAgentExecutorFactory', {
      useFactory: () => {
        // Wrap spawn to ensure stdio is explicitly set to 'pipe'
        const spawnWithPipe = (command: string, args: string[], options?: object) => {
          return spawn(command, args, { ...options, stdio: 'pipe' });
        };
        return new AgentExecutorFactory(spawnWithPipe);
      },
    });
  }

  container.register<IAgentExecutorProvider>('IAgentExecutorProvider', {
    useFactory: (c) => {
      const factory = c.resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
      return new AgentExecutorProvider(factory);
    },
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
      const executorProvider = c.resolve<IAgentExecutorProvider>('IAgentExecutorProvider');
      const checkpointer = c.resolve('Checkpointer') as BaseCheckpointSaver;
      const runRepository = c.resolve<IAgentRunRepository>('IAgentRunRepository');
      return new AgentRunnerService(registry, executorProvider, checkpointer, runRepository);
    },
  });

  container.register<IFeatureAgentProcessService>('IFeatureAgentProcessService', {
    useFactory: (c) => {
      const runRepository = c.resolve<IAgentRunRepository>('IAgentRunRepository');
      return new FeatureAgentProcessService(runRepository);
    },
  });

  container.register<ISpecInitializerService>('ISpecInitializerService', {
    useFactory: () => new SpecInitializerService(),
  });

  // Register use cases (singletons for performance)
  container.registerSingleton(InitializeSettingsUseCase);
  container.registerSingleton(LoadSettingsUseCase);
  container.registerSingleton(UpdateSettingsUseCase);
  container.registerSingleton(ConfigureAgentUseCase);
  container.registerSingleton(ValidateAgentAuthUseCase);
  container.registerSingleton(RunAgentUseCase);
  container.registerSingleton(GetAgentRunUseCase);
  container.registerSingleton(ListAgentRunsUseCase);
  container.registerSingleton(StopAgentRunUseCase);
  container.registerSingleton(DeleteAgentRunUseCase);
  container.registerSingleton(ApproveAgentRunUseCase);
  container.registerSingleton(RejectAgentRunUseCase);
  container.registerSingleton(CreateFeatureUseCase);
  container.registerSingleton(ListFeaturesUseCase);
  container.registerSingleton(ShowFeatureUseCase);
  container.registerSingleton(DeleteFeatureUseCase);
  container.registerSingleton(ResumeFeatureUseCase);

  return container;
}

/**
 * Get the configured container instance.
 * Container must be initialized first via initializeContainer().
 */
export { container };
