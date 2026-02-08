/**
 * AgentRunnerService Unit Tests
 *
 * Tests for the agent runner that orchestrates agent execution,
 * tracking runs through pending -> running -> completed/failed statuses.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRunnerService } from '../../../../../src/infrastructure/services/agents/agent-runner.service.js';
import type {
  IAgentRegistry,
  AgentDefinitionWithFactory,
} from '../../../../../src/application/ports/output/agent-registry.interface.js';
import type { IAgentExecutorFactory } from '../../../../../src/application/ports/output/agent-executor-factory.interface.js';
import type { IAgentRunRepository } from '../../../../../src/application/ports/output/agent-run-repository.interface.js';
import type { IAgentExecutor } from '../../../../../src/application/ports/output/agent-executor.interface.js';
import {
  AgentRunStatus,
  AgentType,
  AgentAuthMethod,
} from '../../../../../src/domain/generated/output.js';
import type { AgentRun } from '../../../../../src/domain/generated/output.js';

// Mock the settings singleton — no top-level variable references inside factory
vi.mock('../../../../../src/infrastructure/services/settings.service.js', () => ({
  getSettings: vi.fn().mockReturnValue({
    agent: {
      type: 'claude-code',
      authMethod: 'session',
    },
  }),
}));

// UUID regex for non-deterministic ID assertions
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('AgentRunnerService', () => {
  let runner: AgentRunnerService;
  let mockRegistry: IAgentRegistry;
  let mockExecutorFactory: IAgentExecutorFactory;
  let mockCheckpointer: any;
  let mockRunRepository: IAgentRunRepository;
  let mockExecutor: IAgentExecutor;
  let mockCompiledGraph: any;
  let mockDefinition: AgentDefinitionWithFactory;

  beforeEach(() => {
    mockExecutor = {
      agentType: AgentType.ClaudeCode,
      execute: vi.fn(),
      executeStream: vi.fn(),
      supportsFeature: vi.fn(),
    };

    mockCompiledGraph = {
      invoke: vi.fn().mockResolvedValue({
        repositoryPath: '/test/repo',
        analysisMarkdown: '# Analysis Result\nThis is the analysis.',
      }),
    };

    mockDefinition = {
      name: 'analyze-repository',
      description: 'Analyze repository structure',
      graphFactory: vi.fn().mockReturnValue(mockCompiledGraph),
    };

    mockRegistry = {
      register: vi.fn(),
      get: vi.fn().mockReturnValue(mockDefinition),
      list: vi.fn().mockReturnValue([mockDefinition]),
    };

    mockExecutorFactory = {
      createExecutor: vi.fn().mockReturnValue(mockExecutor),
      getSupportedAgents: vi.fn().mockReturnValue([AgentType.ClaudeCode]),
    };

    mockCheckpointer = {};

    const storedRuns = new Map<string, AgentRun>();
    mockRunRepository = {
      create: vi.fn().mockImplementation(async (run: AgentRun) => {
        storedRuns.set(run.id, { ...run });
      }),
      findById: vi.fn().mockImplementation(async (id: string) => {
        return storedRuns.get(id) ?? null;
      }),
      findByThreadId: vi.fn().mockResolvedValue(null),
      updateStatus: vi
        .fn()
        .mockImplementation(
          async (id: string, status: AgentRunStatus, updates?: Partial<AgentRun>) => {
            const existing = storedRuns.get(id);
            if (existing) {
              storedRuns.set(id, { ...existing, status, ...updates });
            }
          }
        ),
      findRunningByPid: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    runner = new AgentRunnerService(
      mockRegistry,
      mockExecutorFactory,
      mockCheckpointer,
      mockRunRepository
    );
  });

  describe('runAgent', () => {
    it('should run agent and return completed run record', async () => {
      const result = await runner.runAgent('analyze-repository', 'Analyze the codebase', {
        repositoryPath: '/test/repo',
      });

      expect(result).toBeDefined();
      expect(result.agentName).toBe('analyze-repository');
      expect(result.status).toBe(AgentRunStatus.completed);
      expect(result.result).toBe('# Analysis Result\nThis is the analysis.');
    });

    it('should resolve agent definition from registry', async () => {
      await runner.runAgent('analyze-repository', 'Analyze');

      expect(mockRegistry.get).toHaveBeenCalledWith('analyze-repository');
    });

    it('should create executor using factory with settings agent type', async () => {
      await runner.runAgent('analyze-repository', 'Analyze');

      expect(mockExecutorFactory.createExecutor).toHaveBeenCalledWith(
        AgentType.ClaudeCode,
        expect.objectContaining({
          type: AgentType.ClaudeCode,
          authMethod: AgentAuthMethod.Session,
        })
      );
    });

    it('should save agent run with pending status first', async () => {
      await runner.runAgent('analyze-repository', 'Analyze');

      const createCall = vi.mocked(mockRunRepository.create).mock.calls[0][0];
      expect(createCall.status).toBe(AgentRunStatus.pending);
      expect(createCall.agentName).toBe('analyze-repository');
      expect(createCall.prompt).toBe('Analyze');
      expect(createCall.id).toMatch(UUID_RE);
      expect(createCall.threadId).toMatch(UUID_RE);
      expect(createCall.id).not.toBe(createCall.threadId);
    });

    it('should update status to running before graph invocation', async () => {
      await runner.runAgent('analyze-repository', 'Analyze');

      const createCall = vi.mocked(mockRunRepository.create).mock.calls[0][0];
      expect(mockRunRepository.updateStatus).toHaveBeenCalledWith(
        createCall.id,
        AgentRunStatus.running,
        expect.objectContaining({
          pid: process.pid,
        })
      );

      // Verify running update happened before graph invoke
      const updateCalls = vi.mocked(mockRunRepository.updateStatus).mock.invocationCallOrder;
      const invokeCalls = vi.mocked(mockCompiledGraph.invoke).mock.invocationCallOrder;
      expect(updateCalls[0]).toBeLessThan(invokeCalls[0]);
    });

    it('should update status to completed after successful execution', async () => {
      await runner.runAgent('analyze-repository', 'Analyze');

      // Second updateStatus call is the completed one
      const updateCalls = vi.mocked(mockRunRepository.updateStatus).mock.calls;
      expect(updateCalls).toHaveLength(2);
      expect(updateCalls[1][1]).toBe(AgentRunStatus.completed);
      expect(updateCalls[1][2]).toEqual(
        expect.objectContaining({
          result: '# Analysis Result\nThis is the analysis.',
        })
      );
    });

    it('should compile graph with executor and checkpointer', async () => {
      await runner.runAgent('analyze-repository', 'Analyze');

      expect(mockDefinition.graphFactory).toHaveBeenCalledWith(mockExecutor, mockCheckpointer);
    });

    it('should invoke graph with repositoryPath and thread config', async () => {
      await runner.runAgent('analyze-repository', 'Analyze', {
        repositoryPath: '/my/project',
      });

      const createCall = vi.mocked(mockRunRepository.create).mock.calls[0][0];
      expect(mockCompiledGraph.invoke).toHaveBeenCalledWith(
        { repositoryPath: '/my/project' },
        { configurable: { thread_id: createCall.threadId } }
      );
    });

    it('should use process.cwd() as default repositoryPath', async () => {
      await runner.runAgent('analyze-repository', 'Analyze');

      expect(mockCompiledGraph.invoke).toHaveBeenCalledWith(
        { repositoryPath: process.cwd() },
        expect.any(Object)
      );
    });

    it('should throw error when agent is not found', async () => {
      vi.mocked(mockRegistry.get).mockReturnValue(undefined);

      await expect(runner.runAgent('non-existent', 'Analyze')).rejects.toThrow(
        "Agent 'non-existent' not found"
      );
    });

    it('should include available agents in not-found error message', async () => {
      vi.mocked(mockRegistry.get).mockReturnValue(undefined);

      await expect(runner.runAgent('non-existent', 'Analyze')).rejects.toThrow(
        'analyze-repository'
      );
    });

    it('should handle graph execution errors and set failed status', async () => {
      mockCompiledGraph.invoke.mockRejectedValue(new Error('LLM API timeout'));

      const result = await runner.runAgent('analyze-repository', 'Analyze');

      expect(result.status).toBe(AgentRunStatus.failed);
      expect(result.error).toBe('LLM API timeout');
    });

    it('should handle non-Error thrown values during execution', async () => {
      mockCompiledGraph.invoke.mockRejectedValue('string error');

      const result = await runner.runAgent('analyze-repository', 'Analyze');

      expect(result.status).toBe(AgentRunStatus.failed);
      expect(result.error).toBe('string error');
    });

    it('should set completedAt on failed runs', async () => {
      mockCompiledGraph.invoke.mockRejectedValue(new Error('failure'));

      await runner.runAgent('analyze-repository', 'Analyze');

      const updateCalls = vi.mocked(mockRunRepository.updateStatus).mock.calls;
      const failedUpdate = updateCalls[1];
      expect(failedUpdate[1]).toBe(AgentRunStatus.failed);
      expect(failedUpdate[2]).toEqual(
        expect.objectContaining({
          completedAt: expect.any(String),
          error: 'failure',
        })
      );
    });

    it('should use result field when analysisMarkdown is not present', async () => {
      mockCompiledGraph.invoke.mockResolvedValue({
        repositoryPath: '/test',
        result: 'Plain result text',
      });

      const result = await runner.runAgent('analyze-repository', 'Analyze');

      expect(result.result).toBe('Plain result text');
    });

    it('should JSON stringify result when neither analysisMarkdown nor result is present', async () => {
      const graphOutput = { repositoryPath: '/test', customField: 'value' };
      mockCompiledGraph.invoke.mockResolvedValue(graphOutput);

      const result = await runner.runAgent('analyze-repository', 'Analyze');

      expect(result.result).toBe(JSON.stringify(graphOutput));
    });
  });
});
