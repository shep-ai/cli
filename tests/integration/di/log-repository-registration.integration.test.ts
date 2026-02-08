/**
 * Integration test for ILogRepository DI registration
 *
 * Tests that ILogRepository can be resolved manually from a test container
 * and is properly connected to an in-memory database.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { container as globalContainer } from 'tsyringe';
import type { ILogRepository } from '../../../src/application/ports/output/log-repository.interface.js';
import type { ILogger } from '../../../src/application/ports/output/logger.interface.js';
import type { LogEntry } from '../../../src/domain/generated/output.js';
import Database from 'better-sqlite3';
import { SQLiteLogRepository } from '../../../src/infrastructure/repositories/sqlite-log.repository.js';
import { runSQLiteMigrations } from '../../../src/infrastructure/persistence/sqlite/migrations.js';
import { createMockLogger } from '../../helpers/mock-logger.js';

describe('ILogRepository DI Registration (Integration)', () => {
  let db: Database.Database;
  let childContainer: typeof globalContainer;
  const mockLogger = createMockLogger();

  beforeEach(async () => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    await runSQLiteMigrations(db);

    // Create a child container to avoid polluting global state
    childContainer = globalContainer.createChildContainer();

    // Register test dependencies
    childContainer.registerInstance<Database.Database>('Database', db);
    childContainer.registerInstance<ILogger>('ILogger', mockLogger);

    // Register log repository (singleton pattern)
    let logRepositoryInstance: ILogRepository | null = null;
    childContainer.register<ILogRepository>('ILogRepository', {
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
  });

  afterEach(() => {
    db.close();
    childContainer.reset();
  });

  it('should resolve ILogRepository from container', () => {
    const logRepository = childContainer.resolve<ILogRepository>('ILogRepository');

    expect(logRepository).toBeDefined();
    expect(logRepository.save).toBeDefined();
    expect(logRepository.findById).toBeDefined();
    expect(logRepository.search).toBeDefined();
    expect(logRepository.count).toBeDefined();
    expect(logRepository.deleteOlderThan).toBeDefined();
  });

  it('should save and retrieve log entry via resolved repository', async () => {
    const logRepository = childContainer.resolve<ILogRepository>('ILogRepository');

    const logEntry: LogEntry = {
      id: 'di-test-log-1',
      timestamp: Date.now(),
      level: 'info',
      source: 'di-test',
      message: 'DI integration test message',
      context: { testId: 'di-registration' },
      stackTrace: null,
      createdAt: new Date().toISOString(),
    };

    await logRepository.save(logEntry);

    const retrieved = await logRepository.findById(logEntry.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(logEntry.id);
    expect(retrieved?.message).toBe(logEntry.message);
    expect(retrieved?.context).toEqual(logEntry.context);
  });

  it('should resolve singleton instance (same instance each time)', () => {
    const repo1 = childContainer.resolve<ILogRepository>('ILogRepository');
    const repo2 = childContainer.resolve<ILogRepository>('ILogRepository');

    // Singleton pattern: both resolutions should return the same instance
    expect(repo1).toBe(repo2);
  });

  it('should count and search logs via resolved repository', async () => {
    const logRepository = childContainer.resolve<ILogRepository>('ILogRepository');

    // Insert test logs
    for (let i = 0; i < 5; i++) {
      await logRepository.save({
        id: `di-bulk-log-${i}`,
        timestamp: Date.now() + i,
        level: i % 2 === 0 ? 'info' : 'error',
        source: 'di-test',
        message: `Bulk test message ${i}`,
        stackTrace: null,
        createdAt: new Date().toISOString(),
      });
    }

    const totalCount = await logRepository.count({ source: 'di-test' });
    expect(totalCount).toBeGreaterThanOrEqual(5);

    const errorLogs = await logRepository.search({
      level: 'error',
      source: 'di-test',
    });
    expect(errorLogs.length).toBeGreaterThanOrEqual(2);
  });
});
