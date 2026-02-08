/**
 * RunAgentUseCase Unit Tests
 *
 * Tests for the agent run use case.
 * Uses mock runner and mock registry (manual mock objects).
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunAgentUseCase } from '../../../../../src/application/use-cases/agents/run-agent.use-case.js';
import type { AgentRun, AgentRunEvent } from '../../../../../src/domain/generated/output.js';
import { AgentRunStatus, AgentType } from '../../../../../src/domain/generated/output.js';
import type {
  IAgentRunner,
  AgentRunOptions,
} from '../../../../../src/application/ports/output/agent-runner.interface.js';
import type {
  IAgentRegistry,
  AgentDefinitionWithFactory,
} from '../../../../../src/application/ports/output/agent-registry.interface.js';

function createMockAgentRun(overrides?: Partial<AgentRun>): AgentRun {
  return {
    id: 'run-1',
    agentType: AgentType.ClaudeCode,
    agentName: 'analyze-repository',
    status: AgentRunStatus.running,
    prompt: 'Analyze this repo',
    threadId: 'thread-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockDefinition(name: string): AgentDefinitionWithFactory {
  return {
    name,
    description: `Mock ${name} agent`,
    graphFactory: vi.fn(),
  };
}

describe('RunAgentUseCase', () => {
  let useCase: RunAgentUseCase;
  let mockRunner: IAgentRunner;
  let mockRegistry: IAgentRegistry;

  beforeEach(() => {
    mockRunner = {
      runAgent: vi
        .fn<(name: string, prompt: string, options?: AgentRunOptions) => Promise<AgentRun>>()
        .mockResolvedValue(createMockAgentRun()),
      runAgentStream: vi.fn().mockReturnValue(
        (async function* () {
          yield { type: 'progress', content: 'Working...', timestamp: new Date().toISOString() };
          yield { type: 'result', content: 'Done', timestamp: new Date().toISOString() };
        })()
      ),
    };

    mockRegistry = {
      register: vi.fn(),
      get: vi
        .fn<(name: string) => AgentDefinitionWithFactory | undefined>()
        .mockReturnValue(createMockDefinition('analyze-repository')),
      list: vi
        .fn<() => AgentDefinitionWithFactory[]>()
        .mockReturnValue([createMockDefinition('analyze-repository')]),
    };

    useCase = new RunAgentUseCase(mockRunner, mockRegistry);
  });

  describe('successful execution', () => {
    it('should call agentRunner.runAgent with correct arguments', async () => {
      await useCase.execute({
        agentName: 'analyze-repository',
        prompt: 'Analyze this repo',
      });

      expect(mockRunner.runAgent).toHaveBeenCalledWith(
        'analyze-repository',
        'Analyze this repo',
        undefined
      );
    });

    it('should return the AgentRun from the runner', async () => {
      const expectedRun = createMockAgentRun({ id: 'run-42' });
      vi.mocked(mockRunner.runAgent).mockResolvedValue(expectedRun);

      const result = await useCase.execute({
        agentName: 'analyze-repository',
        prompt: 'Analyze this repo',
      });

      expect(result).toBe(expectedRun);
    });

    it('should pass options through to the runner', async () => {
      const options: AgentRunOptions = {
        repositoryPath: '/my/repo',
        model: 'claude-sonnet-4-5-20250929',
        timeout: 60000,
      };

      await useCase.execute({
        agentName: 'analyze-repository',
        prompt: 'Analyze this repo',
        options,
      });

      expect(mockRunner.runAgent).toHaveBeenCalledWith(
        'analyze-repository',
        'Analyze this repo',
        options
      );
    });
  });

  describe('agent not found', () => {
    it('should throw error when agent name is not found in registry', async () => {
      vi.mocked(mockRegistry.get).mockReturnValue(undefined);

      await expect(
        useCase.execute({
          agentName: 'nonexistent-agent',
          prompt: 'Do something',
        })
      ).rejects.toThrow('Unknown agent: "nonexistent-agent"');

      expect(mockRunner.runAgent).not.toHaveBeenCalled();
    });

    it('should include available agents in error message', async () => {
      vi.mocked(mockRegistry.get).mockReturnValue(undefined);
      vi.mocked(mockRegistry.list).mockReturnValue([
        createMockDefinition('analyze-repository'),
        createMockDefinition('gather-requirements'),
      ]);

      await expect(
        useCase.execute({
          agentName: 'bad-name',
          prompt: 'Do something',
        })
      ).rejects.toThrow('Available agents: analyze-repository, gather-requirements');
    });

    it('should handle empty agent list in error message', async () => {
      vi.mocked(mockRegistry.get).mockReturnValue(undefined);
      vi.mocked(mockRegistry.list).mockReturnValue([]);

      await expect(
        useCase.execute({
          agentName: 'bad-name',
          prompt: 'Do something',
        })
      ).rejects.toThrow('Available agents: none');
    });
  });

  describe('executeStream', () => {
    it('should yield events from agentRunner.runAgentStream()', async () => {
      const events: AgentRunEvent[] = [];
      for await (const event of useCase.executeStream({
        agentName: 'analyze-repository',
        prompt: 'Analyze this repo',
      })) {
        events.push(event);
      }

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('progress');
      expect(events[1].type).toBe('result');
    });

    it('should validate agent exists before streaming', async () => {
      vi.mocked(mockRegistry.get).mockReturnValue(undefined);

      const streamFn = async () => {
        for await (const _event of useCase.executeStream({
          agentName: 'nonexistent',
          prompt: 'Do something',
        })) {
          /* drain */
        }
      };

      await expect(streamFn()).rejects.toThrow('Unknown agent: "nonexistent"');
      expect(mockRunner.runAgentStream).not.toHaveBeenCalled();
    });

    it('should pass options through to the runner', async () => {
      for await (const _event of useCase.executeStream({
        agentName: 'analyze-repository',
        prompt: 'Analyze this repo',
        options: { repositoryPath: '/my/repo' },
      })) {
        /* drain */
      }

      expect(mockRunner.runAgentStream).toHaveBeenCalledWith(
        'analyze-repository',
        'Analyze this repo',
        { repositoryPath: '/my/repo' }
      );
    });
  });
});
