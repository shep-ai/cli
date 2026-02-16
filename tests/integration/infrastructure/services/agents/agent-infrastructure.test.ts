/**
 * Agent Infrastructure Integration Test
 *
 * Verifies the full agent infrastructure stack wires up correctly
 * through the DI container: registry, factory, runner, repository,
 * and use case resolution.
 *
 * Uses an in-memory SQLite database (no external dependencies).
 */

import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { container } from 'tsyringe';
import DatabaseConstructor from 'better-sqlite3';
import type Database from 'better-sqlite3';
import { spawn } from 'node:child_process';

// Infrastructure imports
import { SQLiteAgentRunRepository } from '@/infrastructure/repositories/agent-run.repository.js';
import { AgentExecutorFactory } from '@/infrastructure/services/agents/common/agent-executor-factory.service.js';
import { AgentRegistryService } from '@/infrastructure/services/agents/common/agent-registry.service.js';
import { AgentRunnerService } from '@/infrastructure/services/agents/common/agent-runner.service.js';
import { createCheckpointer } from '@/infrastructure/services/agents/common/checkpointer.js';
import { RunAgentUseCase } from '@/application/use-cases/agents/run-agent.use-case.js';

// Port interfaces
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import type { IAgentExecutorFactory } from '@/application/ports/output/agents/agent-executor-factory.interface.js';
import type { IAgentExecutorProvider } from '@/application/ports/output/agents/agent-executor-provider.interface.js';
import type { IAgentRegistry } from '@/application/ports/output/agents/agent-registry.interface.js';
import type { IAgentRunner } from '@/application/ports/output/agents/agent-runner.interface.js';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import { AgentExecutorProvider } from '@/infrastructure/services/agents/common/agent-executor-provider.service.js';

import { runSQLiteMigrations } from '@/infrastructure/persistence/sqlite/migrations.js';

describe('Agent Infrastructure Integration', () => {
  let db: Database.Database;

  beforeAll(async () => {
    // Create in-memory database with all migrations
    db = new DatabaseConstructor(':memory:');
    db.pragma('journal_mode = WAL');

    await runSQLiteMigrations(db);

    // Register all agent infrastructure in the container
    container.registerInstance<Database.Database>('Database', db);

    container.register<IAgentRunRepository>('IAgentRunRepository', {
      useFactory: () => new SQLiteAgentRunRepository(db),
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

    container.register<IAgentExecutorProvider>('IAgentExecutorProvider', {
      useFactory: (c) => {
        const factory = c.resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
        return new AgentExecutorProvider(factory);
      },
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

    container.registerSingleton(RunAgentUseCase);
  });

  afterAll(() => {
    db.close();
    container.clearInstances();
  });

  describe('DI Container Resolution', () => {
    it('should resolve IAgentRunRepository', () => {
      const repo = container.resolve<IAgentRunRepository>('IAgentRunRepository');
      expect(repo).toBeInstanceOf(SQLiteAgentRunRepository);
    });

    it('should resolve IAgentExecutorFactory', () => {
      const factory = container.resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
      expect(factory).toBeInstanceOf(AgentExecutorFactory);
    });

    it('should resolve IAgentRegistry with pre-registered agents', () => {
      const registry = container.resolve<IAgentRegistry>('IAgentRegistry');
      expect(registry).toBeInstanceOf(AgentRegistryService);

      const agents = registry.list();
      expect(agents.length).toBeGreaterThanOrEqual(1);
      expect(agents.find((a) => a.name === 'analyze-repository')).toBeDefined();
    });

    it('should resolve IAgentRunner', () => {
      const runner = container.resolve<IAgentRunner>('IAgentRunner');
      expect(runner).toBeInstanceOf(AgentRunnerService);
    });

    it('should resolve RunAgentUseCase', () => {
      const useCase = container.resolve(RunAgentUseCase);
      expect(useCase).toBeInstanceOf(RunAgentUseCase);
    });
  });

  describe('Agent Registry', () => {
    it('should have analyze-repository agent with graph factory', () => {
      const registry = container.resolve<IAgentRegistry>('IAgentRegistry');
      const definition = registry.get('analyze-repository');

      expect(definition).toBeDefined();
      expect(definition!.name).toBe('analyze-repository');
      expect(definition!.description).toContain('nalyze');
      expect(typeof definition!.graphFactory).toBe('function');
    });

    it('should allow registering custom agents', () => {
      const registry = container.resolve<IAgentRegistry>('IAgentRegistry');
      const before = registry.list().length;

      registry.register({
        name: 'test-agent',
        description: 'Test agent for integration test',
        graphFactory: () => ({}),
      });

      expect(registry.list().length).toBe(before + 1);
      expect(registry.get('test-agent')).toBeDefined();
    });
  });

  describe('Agent Run Repository', () => {
    it('should create and retrieve agent run records', async () => {
      const repo = container.resolve<IAgentRunRepository>('IAgentRunRepository');

      const agentRun = {
        id: 'test-run-001',
        agentType: 'claude-code' as any,
        agentName: 'analyze-repository',
        status: 'pending' as any,
        prompt: 'Test prompt',
        threadId: 'test-thread-001',
        createdAt: new Date().toISOString() as any,
        updatedAt: new Date().toISOString() as any,
      };

      await repo.create(agentRun);
      const retrieved = await repo.findById('test-run-001');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.agentName).toBe('analyze-repository');
      expect(retrieved!.status).toBe('pending');
    });

    it('should find agent run by thread ID', async () => {
      const repo = container.resolve<IAgentRunRepository>('IAgentRunRepository');

      const found = await repo.findByThreadId('test-thread-001');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('test-run-001');
    });

    it('should update agent run status', async () => {
      const repo = container.resolve<IAgentRunRepository>('IAgentRunRepository');

      await repo.updateStatus('test-run-001', 'running' as any, {
        pid: process.pid,
        startedAt: new Date() as any,
      });

      const updated = await repo.findById('test-run-001');
      expect(updated!.status).toBe('running');
    });
  });

  describe('Agent Executor Factory', () => {
    it('should create Claude Code executor', () => {
      const factory = container.resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
      const executor = factory.createExecutor('claude-code' as any, {} as any);

      expect(executor).toBeDefined();
      expect(executor.agentType).toBe('claude-code');
    });

    it('should throw for unsupported agent type', () => {
      const factory = container.resolve<IAgentExecutorFactory>('IAgentExecutorFactory');

      expect(() => factory.createExecutor('unsupported' as any, {} as any)).toThrow(
        'Unsupported agent type'
      );
    });
  });

  describe('RunAgentUseCase validation', () => {
    it('should throw for unknown agent name', async () => {
      const useCase = container.resolve(RunAgentUseCase);

      await expect(
        useCase.execute({
          agentName: 'non-existent-agent',
          prompt: 'test',
        })
      ).rejects.toThrow('Unknown agent');
    });
  });
});
