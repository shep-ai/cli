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
import type { ILogRepository } from '../../application/ports/output/log-repository.interface.js';
import { SQLiteLogRepository } from '../repositories/sqlite-log.repository.js';

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
import type { ILogger } from '../../application/ports/output/logger.interface.js';
import { PinoLogger } from '../services/logger/pino-logger.service.js';
import { LogLevel } from '../../domain/generated/output.js';

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

  // Register external dependencies as tokens
  const execFileAsync = promisify(execFile);
  container.registerInstance('ExecFunction', execFileAsync);

  // Create logger instance once
  let loggerInstance: ILogger | null = null;

  // Register logger (singleton via cached instance) - MUST be before repositories that depend on it
  container.register<ILogger>('ILogger', {
    useFactory: () => {
      // Return cached instance if available
      if (loggerInstance) {
        return loggerInstance;
      }

      // Use default log level (can be overridden later via config)
      const logLevel = LogLevel.Info;

      // Create logger with console-only transport (file logging disabled for now to avoid E2E test issues)
      // TODO: Enable file logging after E2E tests are updated to handle log directory
      loggerInstance = new PinoLogger({
        level: logLevel,
        // logDir: path.join(os.homedir(), '.shep', 'logs'),
      });

      return loggerInstance;
    },
  });

  // Register repositories (after logger since they depend on it)
  container.register<ISettingsRepository>('ISettingsRepository', {
    useFactory: (c) => {
      const database = c.resolve<Database.Database>('Database');
      const logger = c.resolve<ILogger>('ILogger');
      return new SQLiteSettingsRepository(database, logger);
    },
  });

  // Register log repository as singleton
  let logRepositoryInstance: ILogRepository | null = null;
  container.register<ILogRepository>('ILogRepository', {
    useFactory: (c) => {
      if (logRepositoryInstance) {
        return logRepositoryInstance;
      }
      const database = c.resolve<Database.Database>('Database');
      const logger = c.resolve<ILogger>('ILogger');
      logRepositoryInstance = new SQLiteLogRepository(database, logger);
      return logRepositoryInstance;
    },
  });

  // Register services (singletons via @injectable + token)
  container.registerSingleton<IAgentValidator>('IAgentValidator', AgentValidatorService);
  container.registerSingleton<IVersionService>('IVersionService', VersionService);
  container.register<IWebServerService>('IWebServerService', {
    useFactory: (c) => {
      const logger = c.resolve<ILogger>('ILogger');
      return new WebServerService(logger);
    },
  });

  // Register agent infrastructure
  container.register<IAgentRunRepository>('IAgentRunRepository', {
    useFactory: (c) => {
      const database = c.resolve<Database.Database>('Database');
      return new SQLiteAgentRunRepository(database);
    },
  });

  container.register<IAgentExecutorFactory>('IAgentExecutorFactory', {
    useFactory: () => {
      // Wrap spawn to ensure stdio is explicitly set to 'pipe'
      const spawnWithPipe = (command: string, args: string[], options?: object) => {
        return spawn(command, args, { ...options, stdio: 'pipe' });
      };
      return new AgentExecutorFactory(spawnWithPipe);
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
 * Track initialization state for lazy loading
 */
let isInitialized = false;
let initializationPromise: Promise<typeof container> | null = null;

/**
 * Ensure container is initialized before resolving dependencies.
 * Safe to call multiple times - initialization happens only once.
 */
export async function ensureInitialized(): Promise<typeof container> {
  if (isInitialized) {
    return container;
  }

  if (!initializationPromise) {
    initializationPromise = initializeContainer().then((c) => {
      isInitialized = true;
      return c;
    });
  }

  return initializationPromise;
}

/**
 * Get the configured container instance.
 * For Next.js API routes: Use ensureInitialized() to auto-initialize on first request.
 * For CLI: Container is pre-initialized during bootstrap.
 */
export { container };
